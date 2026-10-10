import { prisma } from '@/lib/prisma';
import { RawCandidate } from './llm';

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

function parseDateSafe(dateVal: string | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

function isDateWithinDays(d1: Date, d2: Date, days: number): boolean {
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  const maxDiffMs = days * 24 * 60 * 60 * 1000;
  return diffMs <= maxDiffMs;
}

function isNameSimilar(name1: string, name2: string): boolean {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;

  if (norm1.length >= 4 && norm2.includes(norm1)) return true;
  if (norm2.length >= 4 && norm1.includes(norm2)) return true;

  return false;
}

export interface ExistingTarget {
  name: string;
  startDate: Date | null;
  sourceUrl?: string | null;
}

/**
 * DB에서 중복 검사용 기존 팝업 및 최근 제출 목록을 가져옵니다.
 */
export async function getExistingTargets(todayKstDate: Date): Promise<ExistingTarget[]> {
  const fourteenDaysAgo = new Date(todayKstDate.getTime() - 14 * 24 * 60 * 60 * 1000);
  const hundredTwentyDaysAgo = new Date(todayKstDate.getTime() - 120 * 24 * 60 * 60 * 1000);

  // (a) popups 중 endDate가 오늘-14일 이후이거나 null인 것
  const popups = await prisma.popup.findMany({
    where: {
      OR: [
        { endDate: { gte: fourteenDaysAgo } },
        { endDate: null },
      ],
    },
    select: {
      name: true,
      startDate: true,
      sourceUrl: true,
    },
  });

  // (b) submissions 전체 상태(pending/approved/rejected) 중 최근 120일 생성분
  const submissions = await prisma.submission.findMany({
    where: {
      createdAt: { gte: hundredTwentyDaysAgo },
    },
    select: {
      popupData: true,
    },
  });

  const targets: ExistingTarget[] = [];

  for (const p of popups) {
    targets.push({
      name: p.name,
      startDate: p.startDate,
      sourceUrl: p.sourceUrl,
    });
  }

  for (const s of submissions) {
    const data = s.popupData as any;
    if (data && typeof data === 'object') {
      targets.push({
        name: typeof data.name === 'string' ? data.name : '',
        startDate: parseDateSafe(data.startDate),
        sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : null,
      });
    }
  }

  return targets;
}

export function isDuplicate(
  candidate: RawCandidate,
  targets: ExistingTarget[],
  effectiveUrl?: string
): boolean {
  const candStartDate = parseDateSafe(candidate.startDate);
  const compareUrl = effectiveUrl || candidate.sourceUrl;

  for (const target of targets) {
    // 1. sourceUrl 일치 여부 (submissions 또는 popup과 동일 URL)
    if (
      compareUrl &&
      target.sourceUrl &&
      compareUrl.trim().toLowerCase() === target.sourceUrl.trim().toLowerCase()
    ) {
      return true;
    }

    // 2. 정규화된 이름 유사도 + startDate 7일 이내
    if (isNameSimilar(candidate.name, target.name)) {
      if (!candStartDate || !target.startDate) {
        // 둘 중 하나라도 날짜가 없으면 이름 일치만으로 중복 판정
        return true;
      }
      if (isDateWithinDays(candStartDate, target.startDate, 7)) {
        return true;
      }
    }
  }

  return false;
}
