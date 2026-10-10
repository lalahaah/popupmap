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
  const startTime = Date.now();
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
    const elapsedMs = Date.now() - startTime;
    return {
      skipped: 'backlog',
      pendingAuto,
      maxPendingAuto: MAX_PENDING_AUTO,
      todayKst,
      elapsedMs,
      timeBudgetWarning: elapsedMs > 45000,
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

  // ④ collectRawCandidates 호출 (그룹 병렬)
  const {
    items: rawCandidates,
    invalidCount,
    invalidItems,
    llm: llmDiag,
    grounded,
    retried,
    perCall,
  } = await collectRawCandidates({
    todayKst,
    existingNames,
  });

  if (!grounded) {
    const elapsedMs = Date.now() - startTime;
    return {
      skipped: 'no_grounding',
      retried,
      grounded,
      elapsedMs,
      timeBudgetWarning: elapsedMs > 45000,
      ...(dryRun ? { perCall } : {}),
      llm: llmDiag,
    };
  }

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

  // ⑤ 그룹 간 중복 제거 (name 정규화 + startDate 기준)
  const uniqueGroupCandidates: RawCandidate[] = [];
  let groupDuplicatesCount = 0;

  for (const cand of rawCandidates) {
    const normName = cand.name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
    const isDup = uniqueGroupCandidates.some((existing) => {
      const existingNorm = existing.name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      const sameName =
        normName === existingNorm ||
        (normName.length >= 4 &&
          existingNorm.length >= 4 &&
          (normName.includes(existingNorm) || existingNorm.includes(normName)));
      return sameName && existing.startDate === cand.startDate;
    });

    if (isDup) {
      groupDuplicatesCount++;
      dropped.push({
        name: cand.name,
        sourceUrl: cand.sourceUrl,
        reason: 'duplicate',
        detail: `그룹 간 중복 (동일/유사 이름 및 시작일 ${cand.startDate})`,
      });
    } else {
      uniqueGroupCandidates.push(cand);
    }
  }

  // ⑥ 종료(endDate < 오늘)이거나 startDate가 오늘+WINDOW_DAYS 이후인 항목 제거
  let endedCount = 0;
  const inRangeCandidates: RawCandidate[] = [];

  for (const cand of uniqueGroupCandidates) {
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

  // ⑦ 기존 DB 대상(popups, submissions) 중복 제거 (dedupe)
  const existingTargets = await getExistingTargets(todayDateObj);
  let dbDuplicatesCount = 0;
  const dedupedCandidates: RawCandidate[] = [];

  for (const cand of inRangeCandidates) {
    if (isDuplicate(cand, existingTargets)) {
      dbDuplicatesCount++;
      dropped.push({
        name: cand.name,
        sourceUrl: cand.sourceUrl,
        reason: 'duplicate',
        detail: '기존 팝업 또는 제보와 중복',
      });
    } else {
      dedupedCandidates.push(cand);
      existingTargets.push({
        name: cand.name,
        startDate: cand.startDate ? new Date(cand.startDate) : null,
        sourceUrl: cand.sourceUrl,
      });
    }
  }

  // ⑧ MAX_CANDIDATES(15건) 상한 슬라이스 적용
  const cappedCandidates = dedupedCandidates.slice(0, MAX_CANDIDATES);

  // ⑨ 출처 검증 (최대 15건에 대해 동시에 최대 5건씩 병렬 처리)
  let mismatchCount = 0;
  const verifiedList: Array<{
    candidate: RawCandidate;
    result: VerificationResult;
    effectiveUrl: string;
  }> = [];

  for (let i = 0; i < cappedCandidates.length; i += 5) {
    const chunk = cappedCandidates.slice(i, i + 5);
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

      // 유효한 최종 URL 결정
      const effectiveUrl = (isVertex ? res.finalUrl : (res.finalUrl || cand.sourceUrl))!;

      verifiedList.push({
        candidate: cand,
        result: res,
        effectiveUrl,
      });
    }
  }

  // ⑩ 통계 계산
  let verifiedCount = 0;
  let nameOnlyCount = 0;
  let unreadableCount = 0;

  for (const item of verifiedList) {
    if (item.result.level === 'verified') verifiedCount++;
    else if (item.result.level === 'name_only') nameOnlyCount++;
    else if (item.result.level === 'unreadable') unreadableCount++;
  }

  // ⑪ DB 삽입 (dryRun이 아닌 경우)
  let insertedCount = 0;
  if (!dryRun) {
    for (const item of verifiedList) {
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

  // ⑫ 요약 및 응답 반환
  const elapsedMs = Date.now() - startTime;
  const timeBudgetWarning = elapsedMs > 45000;

  const baseSummary = {
    model: GEMINI_MODEL,
    dryRun,
    grounded,
    retried,
    elapsedMs,
    timeBudgetWarning,
    parsed: rawCandidates.length + invalidCount,
    invalid: invalidCount,
    ended: endedCount,
    duplicates: groupDuplicatesCount + dbDuplicatesCount,
    mismatch: mismatchCount,
    verified: verifiedCount,
    name_only: nameOnlyCount,
    unreadable: unreadableCount,
    inserted: dryRun ? 0 : insertedCount,
  };

  if (dryRun) {
    return {
      ...baseSummary,
      perCall,
      llm: llmDiag,
      candidates: verifiedList.map((c) => ({
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
    candidates: verifiedList.map((c) => ({
      name: c.candidate.name,
      sourceUrl: c.effectiveUrl,
      verification: c.result.level,
    })),
  };
}
