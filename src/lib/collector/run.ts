import { prisma } from '@/lib/prisma';
import {
  GEMINI_MODEL,
  WINDOW_DAYS,
  MAX_CANDIDATES,
  MAX_PENDING_AUTO,
} from './config';
import { collectRawCandidates, RawCandidate } from './llm';
import {
  verifyCandidate,
  VerificationResult,
  isVertexAiHost,
  isGoogleHost,
} from './verify';
import { getExistingTargets, isDuplicate } from './dedupe';

function getTodayKst(): { dateStr: string; dateObj: Date; maxStartDateStr: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(new Date()); // YYYY-MM-DD
  const dateObj = new Date(`${dateStr}T00:00:00+09:00`);

  const maxDateObj = new Date(dateObj.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const maxStartDateStr = formatter.format(maxDateObj);

  return { dateStr, dateObj, maxStartDateStr };
}

export interface RunCollectorOptions {
  dryRun?: boolean;
}

export interface DroppedItem {
  name: string;
  sourceUrl: string;
  reason: 'mismatch' | 'duplicate' | 'ended' | 'out_of_window' | 'unresolved_redirect' | 'invalid';
  detail: string;
}

export async function runCollector(options: RunCollectorOptions = {}) {
  const dryRun = !!options.dryRun;
  const dropped: DroppedItem[] = [];

  // ① 오늘 날짜(KST) 계산
  const { dateStr: todayKst, dateObj: todayDateObj, maxStartDateStr } = getTodayKst();

  // ② pending이면서 popupData.autoCollected===true인 건수가 MAX_PENDING_AUTO 이상이면 backlog 종료
  const pendingSubmissions = await prisma.submission.findMany({
    where: { status: 'pending' },
    select: { popupData: true },
  });

  const pendingAuto = pendingSubmissions.filter((sub) => {
    const data = sub.popupData as any;
    return data && data.autoCollected === true;
  }).length;

  if (pendingAuto >= MAX_PENDING_AUTO) {
    return {
      skipped: 'backlog',
      pendingAuto,
      maxPendingAuto: MAX_PENDING_AUTO,
      todayKst,
    };
  }

  // ③ existingNames 구성 (최근 popups 이름 최대 150개 + pending submissions 이름 최대 50개)
  const recentPopups = await prisma.popup.findMany({
    orderBy: { createdAt: 'desc' },
    take: 150,
    select: { name: true },
  });

  const recentPending = await prisma.submission.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { popupData: true },
  });

  const existingNamesSet = new Set<string>();
  for (const p of recentPopups) {
    if (p.name) existingNamesSet.add(p.name);
  }
  for (const s of recentPending) {
    const data = s.popupData as any;
    if (data?.name && typeof data.name === 'string') {
      existingNamesSet.add(data.name);
    }
  }
  const existingNames = Array.from(existingNamesSet);

  // ④ collectRawCandidates 호출
  const { items: rawCandidates, invalidCount, invalidItems } = await collectRawCandidates({
    todayKst,
    existingNames,
  });

  if (invalidItems) {
    for (const inv of invalidItems) {
      dropped.push({
        name: inv.name,
        sourceUrl: inv.sourceUrl,
        reason: 'invalid',
        detail: inv.detail,
      });
    }
  }

  // ⑤ 이미 종료(endDate < 오늘)이거나 startDate가 오늘+WINDOW_DAYS 이후인 항목 제거
  let endedCount = 0;
  const inRangeCandidates: RawCandidate[] = [];

  for (const cand of rawCandidates) {
    if (cand.endDate && cand.endDate < todayKst) {
      endedCount++;
      dropped.push({
        name: cand.name,
        sourceUrl: cand.sourceUrl,
        reason: 'ended',
        detail: `종료일(${cand.endDate})이 오늘(${todayKst}) 이전임`,
      });
      continue;
    }
    if (cand.startDate > maxStartDateStr) {
      endedCount++;
      dropped.push({
        name: cand.name,
        sourceUrl: cand.sourceUrl,
        reason: 'out_of_window',
        detail: `시작일(${cand.startDate})이 ${WINDOW_DAYS}일 후(${maxStartDateStr})를 초과함`,
      });
      continue;
    }
    inRangeCandidates.push(cand);
  }

  // ⑥ 5개씩 동시 처리로 verifyCandidate 실행
  // sourceUrl 정규화(리다이렉트 추적) 및 mismatch/unresolved_redirect 처리
  let mismatchCount = 0;
  const verifiedList: Array<{
    candidate: RawCandidate;
    result: VerificationResult;
    effectiveUrl: string;
  }> = [];

  for (let i = 0; i < inRangeCandidates.length; i += 5) {
    const chunk = inRangeCandidates.slice(i, i + 5);
    const results = await Promise.all(chunk.map((cand) => verifyCandidate(cand)));

    for (let j = 0; j < chunk.length; j++) {
      const cand = chunk[j];
      const res = results[j];
      const isVertex = isVertexAiHost(cand.sourceUrl);

      // vertexaisearch URL인 경우: finalUrl 확인 및 검증
      if (isVertex) {
        if (!res.finalUrl || isGoogleHost(res.finalUrl)) {
          dropped.push({
            name: cand.name,
            sourceUrl: cand.sourceUrl,
            reason: 'unresolved_redirect',
            detail: `최종 URL이 유효한 외부 출처로 리다이렉트되지 않음 (${res.finalUrl || 'URL 없음'}, ${res.detail})`,
          });
          continue; // 폐기
        }
      }

      // mismatch인 경우 폐기
      if (res.level === 'mismatch') {
        mismatchCount++;
        dropped.push({
          name: cand.name,
          sourceUrl: cand.sourceUrl,
          reason: 'mismatch',
          detail: res.detail,
        });
        continue; // 폐기
      }

      // 유효한 최종 URL 결정: vertexaisearch면 finalUrl로 교체, 일반 URL이면 finalUrl 또는 원본 sourceUrl
      const effectiveUrl = (isVertex ? res.finalUrl : (res.finalUrl || cand.sourceUrl))!;

      verifiedList.push({
        candidate: cand,
        result: res,
        effectiveUrl,
      });
    }
  }

  // ⑦ 중복 제거 (dedupe): finalUrl (effectiveUrl) 기준으로 비교
  const existingTargets = await getExistingTargets(todayDateObj);
  let duplicatesCount = 0;
  const nonDuplicateCandidates: Array<{
    candidate: RawCandidate;
    result: VerificationResult;
    effectiveUrl: string;
  }> = [];

  for (const item of verifiedList) {
    if (isDuplicate(item.candidate, existingTargets, item.effectiveUrl)) {
      duplicatesCount++;
      dropped.push({
        name: item.candidate.name,
        sourceUrl: item.candidate.sourceUrl,
        reason: 'duplicate',
        detail: `기존 팝업 또는 제보와 중복 (비교 URL: ${item.effectiveUrl})`,
      });
    } else {
      nonDuplicateCandidates.push(item);
      // 이후 후보들과의 상호 중복 방지를 위해 targets에 추가
      existingTargets.push({
        name: item.candidate.name,
        startDate: item.candidate.startDate ? new Date(item.candidate.startDate) : null,
        sourceUrl: item.effectiveUrl,
      });
    }
  }

  // 통계 계산
  let verifiedCount = 0;
  let nameOnlyCount = 0;
  let unreadableCount = 0;

  for (const item of nonDuplicateCandidates) {
    if (item.result.level === 'verified') verifiedCount++;
    else if (item.result.level === 'name_only') nameOnlyCount++;
    else if (item.result.level === 'unreadable') unreadableCount++;
  }

  // ⑧ 남은 후보를 MAX_CANDIDATES까지만 사용
  const finalCandidates = nonDuplicateCandidates.slice(0, MAX_CANDIDATES);
  let insertedCount = 0;

  if (!dryRun) {
    for (const item of finalCandidates) {
      const { candidate, result, effectiveUrl } = item;
      await prisma.submission.create({
        data: {
          status: 'pending',
          submitterContact: 'auto-collector',
          popupData: {
            name: candidate.name,
            brand: candidate.brandName || null,
            category: candidate.category,
            address: candidate.address,
            startDate: candidate.startDate,
            endDate: candidate.endDate || null,
            description: candidate.description || '',
            sourceUrl: effectiveUrl,
            autoCollected: true,
            autoMeta: {
              model: GEMINI_MODEL,
              verification: result.level,
              detail: result.detail,
              collectedAt: new Date().toISOString(),
            },
          },
        },
      });
      insertedCount++;
    }
  }

  // ⑨ 요약 반환
  const baseSummary = {
    model: GEMINI_MODEL,
    dryRun,
    parsed: rawCandidates.length + invalidCount,
    invalid: invalidCount,
    ended: endedCount,
    duplicates: duplicatesCount,
    mismatch: mismatchCount,
    verified: verifiedCount,
    name_only: nameOnlyCount,
    unreadable: unreadableCount,
    inserted: dryRun ? 0 : insertedCount,
  };

  if (dryRun) {
    return {
      ...baseSummary,
      candidates: finalCandidates.map((c) => ({
        name: c.candidate.name,
        brand: c.candidate.brandName,
        category: c.candidate.category,
        address: c.candidate.address,
        startDate: c.candidate.startDate,
        endDate: c.candidate.endDate,
        description: c.candidate.description,
        sourceUrl: c.candidate.sourceUrl, // 원본
        finalUrl: c.effectiveUrl, // 최종
        verification: c.result.level,
        detail: c.result.detail,
      })),
      dropped,
    };
  }

  return {
    ...baseSummary,
    candidates: finalCandidates.map((c) => ({
      name: c.candidate.name,
      sourceUrl: c.effectiveUrl,
      verification: c.result.level,
    })),
  };
}
