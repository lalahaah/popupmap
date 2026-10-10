import { prisma } from '@/lib/prisma';
import { RawCandidate } from './llm';

const STOPWORDS = new Set([
  '팝업',
  '팝업스토어',
  '스토어',
  '전시',
  '공식',
  '오픈',
  '한정',
  'x',
  'the',
  'pop-up',
  'popup',
]);

export function normalize(s?: string | null): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

export function parseDateSafe(dateVal: string | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

export function extractDistrict(addr?: string | null): string | null {
  if (!addr) return null;
  const m = addr.match(/([가-힣]+구)(?:\s|$|,)/);
  return m ? m[1] : null;
}

export function extractRoadCore(addr?: string | null): string | null {
  if (!addr) return null;
  // 도로명+번호 패턴 (예: "여의대로 108", "아차산로5길 24-14", "한강대로23길 55")
  const m = addr.match(/([가-힣0-9]+(?:로|길)(?:\d+길)?)\s*(\d+(?:-\d+)?)/);
  return m ? (m[1] + m[2]).replace(/\s+/g, '') : null;
}

export function getBigrams(str: string): string[] {
  const s = normalize(str);
  const bigrams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.slice(i, i + 2));
  }
  return bigrams;
}

export function diceSimilarity(str1: string, str2: string): number {
  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);
  if (bg1.length === 0 || bg2.length === 0) return 0;

  const counts1 = new Map<string, number>();
  for (const b of bg1) counts1.set(b, (counts1.get(b) || 0) + 1);

  let intersection = 0;
  for (const b of bg2) {
    const c = counts1.get(b) || 0;
    if (c > 0) {
      intersection++;
      counts1.set(b, c - 1);
    }
  }
  return (2 * intersection) / (bg1.length + bg2.length);
}

export function extractTokens(name: string, brandName?: string | null): Set<string> {
  const text = `${name} ${brandName || ''}`.toLowerCase();
  const words = text.replace(/[^a-z0-9가-힣]/g, ' ').split(/\s+/);
  const tokens = new Set<string>();
  for (const w of words) {
    if (w.length >= 2 && !STOPWORDS.has(w)) {
      tokens.add(w);
    }
  }
  return tokens;
}

export interface DedupeItem {
  name: string;
  brandName?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  address?: string | null;
  sourceUrl?: string | null;
}

export interface ExistingTarget extends DedupeItem {
  startDate: Date | null;
}

/**
 * 두 항목 간의 중복 여부를 강화된 규칙으로 판정합니다.
 * 선행 조건: 두 기간이 겹치거나 시작일 차이 3일 이하
 * 만족 조건(하나 이상):
 *  a) brandName이 둘 다 있고 정규화 후 동일하며, 주소 구(区) 단위 일치 또는 한쪽 주소 빈 값
 *  b) 정규화한 name 한쪽이 다른 쪽을 포함하거나 글자 bigram Dice 유사도 >= 0.6
 *  c) 도로명주소 핵심(도로명+번호)이 같고 일반어 제외 길이 2 이상 토큰이 하나 이상 겹침
 */
export function isDuplicatePair(
  a: DedupeItem,
  b: DedupeItem,
  effectiveUrlA?: string
): boolean {
  const compareUrlA = effectiveUrlA || a.sourceUrl;
  if (
    compareUrlA &&
    b.sourceUrl &&
    compareUrlA.trim().toLowerCase() === b.sourceUrl.trim().toLowerCase()
  ) {
    return true;
  }

  const sA = parseDateSafe(a.startDate);
  const sB = parseDateSafe(b.startDate);

  // 선행 조건: 두 기간이 겹치거나 시작일 차이 3일 이하
  if (sA && sB) {
    const eA = parseDateSafe(a.endDate) || sA;
    const eB = parseDateSafe(b.endDate) || sB;
    const isOverlap = sA.getTime() <= eB.getTime() && sB.getTime() <= eA.getTime();
    const diffDays = Math.abs(sA.getTime() - sB.getTime()) / (24 * 60 * 60 * 1000);
    if (!isOverlap && diffDays > 3) {
      return false;
    }
  }

  // a) brandName 조건
  const normBrandA = normalize(a.brandName);
  const normBrandB = normalize(b.brandName);
  if (normBrandA && normBrandB && normBrandA === normBrandB) {
    const distA = extractDistrict(a.address);
    const distB = extractDistrict(b.address);
    if (!distA || !distB || distA === distB) {
      return true;
    }
  }

  // b) name 포함 or bigram Dice 유사도 0.6 이상
  const normNameA = normalize(a.name);
  const normNameB = normalize(b.name);
  if (normNameA && normNameB) {
    if (normNameA.length >= 2 && normNameB.length >= 2) {
      if (normNameA.includes(normNameB) || normNameB.includes(normNameA)) {
        return true;
      }
    }
    if (diceSimilarity(a.name, b.name) >= 0.6) {
      return true;
    }
  }

  // c) 도로명주소 핵심 같고 일반어 제외 토큰 겹침
  const roadA = extractRoadCore(a.address);
  const roadB = extractRoadCore(b.address);
  if (roadA && roadB && roadA === roadB) {
    const tokensA = extractTokens(a.name, a.brandName);
    const tokensB = extractTokens(b.name, b.brandName);
    for (const t of tokensA) {
      if (tokensB.has(t)) {
        return true;
      }
    }
  }

  return false;
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
      brand: { select: { name: true } },
      startDate: true,
      endDate: true,
      address: true,
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
      brandName: p.brand?.name || null,
      startDate: p.startDate,
      endDate: p.endDate,
      address: p.address,
      sourceUrl: p.sourceUrl,
    });
  }

  for (const s of submissions) {
    const data = s.popupData as any;
    if (data && typeof data === 'object') {
      targets.push({
        name: typeof data.name === 'string' ? data.name : '',
        brandName: typeof data.brand === 'string' ? data.brand : (typeof data.brandName === 'string' ? data.brandName : null),
        startDate: parseDateSafe(data.startDate),
        endDate: parseDateSafe(data.endDate),
        address: typeof data.address === 'string' ? data.address : null,
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
  for (const target of targets) {
    if (isDuplicatePair(candidate, target, effectiveUrl)) {
      return true;
    }
  }
  return false;
}
