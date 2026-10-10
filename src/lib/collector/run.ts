import { prisma } from '@/lib/prisma';
import {
  GEMINI_MODEL,
  WINDOW_DAYS,
  MAX_CANDIDATES,
  MAX_PENDING_AUTO,
} from './config';
import { collectRawCandidates, RawCandidate } from './llm';
import { verifyCandidate, VerificationResult } from './verify';
import { getExistingTargets, isDuplicate, ExistingTarget } from './dedupe';

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

export async function runCollector(options: RunCollectorOptions = {}) {
  const dryRun = !!options.dryRun;

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
  const { items: rawCandidates, invalidCount } = await collectRawCandidates({
    todayKst,
    existingNames,
  });

  // ⑤ 이미 종료(endDate < 오늘)이거나 startDate가 오늘+WINDOW_DAYS 이후인 항목 제거
  let endedCount = 0;
  const inRangeCandidates: RawCandidate[] = [];

  for (const cand of rawCandidates) {
    if (cand.endDate && cand.endDate < todayKst) {
      endedCount++;
      continue;
    }
    if (cand.startDate > maxStartDateStr) {
      endedCount++;
      continue;
    }
    inRangeCandidates.push(cand);
  }

  // ⑥ 중복 제거
  const existingTargets = await getExistingTargets(todayDateObj);
  let duplicatesCount = 0;
  const nonDuplicateCandidates: RawCandidate[] = [];

  for (const cand of inRangeCandidates) {
    if (isDuplicate(cand, existingTargets)) {
      duplicatesCount++;
    } else {
      nonDuplicateCandidates.push(cand);
      // 이후 후보들과의 상호 중복 방지를 위해 targets에 추가
      existingTargets.push({
        name: cand.name,
        startDate: cand.startDate ? new Date(cand.startDate) : null,
        sourceUrl: cand.sourceUrl,
      });
    }
  }

  // ⑦ 5개씩 동시 처리로 verifyCandidate 실행, "mismatch"는 폐기
  let mismatchCount = 0;
  let verifiedCount = 0;
  let nameOnlyCount = 0;
  let unreadableCount = 0;

  const verifiedList: { candidate: RawCandidate; result: VerificationResult }[] = [];

  for (let i = 0; i < nonDuplicateCandidates.length; i += 5) {
    const chunk = nonDuplicateCandidates.slice(i, i + 5);
    const results = await Promise.all(chunk.map((cand) => verifyCandidate(cand)));

    for (let j = 0; j < chunk.length; j++) {
      const cand = chunk[j];
      const res = results[j];

      if (res.level === 'mismatch') {
        mismatchCount++;
      } else {
        verifiedList.push({ candidate: cand, result: res });
        if (res.level === 'verified') verifiedCount++;
        else if (res.level === 'name_only') nameOnlyCount++;
        else if (res.level === 'unreadable') unreadableCount++;
      }
    }
  }

  // ⑧ 남은 후보를 MAX_CANDIDATES까지만 사용
  const finalCandidates = verifiedList.slice(0, MAX_CANDIDATES);
  let insertedCount = 0;

  if (!dryRun) {
    for (const item of finalCandidates) {
      const { candidate, result } = item;
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
            sourceUrl: candidate.sourceUrl,
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
  return {
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
    candidates: finalCandidates.map((c) => ({
      name: c.candidate.name,
      sourceUrl: c.candidate.sourceUrl,
      verification: c.result.level,
    })),
  };
}
