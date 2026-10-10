import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { GEMINI_MODEL, WINDOW_DAYS, REGION_FOCUS } from './config';

export interface RawCandidate {
  name: string;
  brandName: string | null;
  category: 'FASHION' | 'BEAUTY' | 'FOOD' | 'GOODS' | 'EXHIBIT' | 'ETC';
  address: string;
  startDate: string;
  endDate: string | null;
  description: string;
  sourceUrl: string;
}

export interface GroupCallResult {
  group: string;
  ok: boolean;
  parsed: number;
  redirectUrlCount: number;
  elapsedMs: number;
  error?: string;
}

export interface LlmDiagInfo {
  rawTextLength: number;
  parseFailed: boolean;
  rawTextHead: string; // 최대 8000자
  webSearchQueries: string[];
  groundingChunkCount: number;
  groundingDomains: string[];
}

export interface CollectRawCandidatesResult {
  items: RawCandidate[];
  groundingDomains: string[];
  invalidCount: number;
  invalidItems: Array<{ name: string; sourceUrl: string; detail: string }>;
  grounded: boolean;
  retried: boolean; // 재시도 없음
  perCall: GroupCallResult[];
  llm: LlmDiagInfo;
}

const candidateSchema = z.object({
  name: z.string().min(2),
  brandName: z.string().nullable().optional().transform(v => (v && v.trim() ? v.trim() : null)),
  category: z.enum(['FASHION', 'BEAUTY', 'FOOD', 'GOODS', 'EXHIBIT', 'ETC']),
  address: z.string().min(2),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null(), z.literal('')]).optional().transform(v => (v ? v : null)),
  description: z.string().max(300).optional().transform(v => v || ''),
  sourceUrl: z.string().url(),
});

const REDIRECT_SIGNATURE = 'vertexaisearch.cloud.google.com/grounding-api-redirect';
const TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function collectRawCandidates({
  todayKst,
  existingNames,
}: {
  todayKst: string;
  existingNames: string[];
}): Promise<CollectRawCandidatesResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }

  // {월}, {다음달} 계산
  const [yearStr, monthStr] = todayKst.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonth = parseInt(monthStr, 10);
  const currentMonthLabel = `${currentYear}년 ${currentMonth}월`;

  let nextYear = currentYear;
  let nextMonth = currentMonth + 1;
  if (nextMonth > 12) {
    nextYear += 1;
    nextMonth = 1;
  }
  const nextMonthLabel = `${nextYear}년 ${nextMonth}월`;

  const groups: Record<string, string[]> = {
    A: [`${currentMonthLabel} 성수 팝업스토어`, `${currentMonthLabel} 서울숲 건대 팝업스토어`],
    B: [`${currentMonthLabel} 더현대 서울 팝업스토어`, `${currentMonthLabel} 여의도 팝업스토어`],
    C: [`${currentMonthLabel} 홍대 팝업스토어`, `${currentMonthLabel} 연남 합정 팝업스토어`],
    D: [`${currentMonthLabel} 한남 용산 팝업스토어`, `${currentMonthLabel} 용산 아이파크몰 팝업`],
    E: [`${currentMonthLabel} 강남 잠실 팝업스토어`, `${currentMonthLabel} 롯데월드몰 팝업`],
    F: [`팝가 ${currentMonthLabel} 팝업 오픈 예정`, `${nextMonthLabel} 서울 팝업스토어 오픈 예정`, `헤이팝 ${currentMonthLabel} 팝업`],
  };

  const ai = new GoogleGenAI({ apiKey });

  const executeGroupCall = async (groupKey: string, searchTerms: string[]) => {
    const callStart = Date.now();

    const prompt = `오늘 날짜: ${todayKst} (한국 시간)

[필수 절차]
답하기 전에 반드시 Google 검색 도구로 아래 검색을 각각 수행한다.
검색을 수행하지 않고 기억만으로 답하지 않는다. 검색 결과에서 확인되지 않은 팝업은 쓰지 않는다.
이 검색어들의 결과에서 확인된 진행 중·예정 팝업을 빠짐없이 모두 포함한다 (그룹당 최대 8개).
검색어:
${searchTerms.map((t) => `- ${t}`).join('\n')}

너는 한국 팝업스토어 정보를 조사하는 리서처다. Google 검색을 사용해서, 지금 진행 중이거나 앞으로 ${WINDOW_DAYS}일 안에 시작하는 팝업스토어를 찾아라.

우선 참고할 출처: 성수동고릴라(seongsudonggorilla.com), 팝가(popga.co.kr), 데이포유(dayforyou.com), 브랜드 공식 채널/보도자료, 언론 기사.
지역: 전국. 단 ${REGION_FOCUS}를 우선 찾아라.

이미 등록된 팝업 (중복이므로 제외):
${existingNames.length > 0 ? existingNames.join('\n') : '(등록된 팝업 없음)'}

규칙:
- 검색으로 확인된 사실만 쓴다. 확인하지 못한 값은 null. 추측·창작 금지.
- name은 출처에 적힌 공식 팝업명 그대로 쓴다. 요약·합성·수식어 추가 금지.
- 날짜는 연도까지 확인해서 YYYY-MM-DD로 쓴다. 출처에 연도가 없으면 오늘 날짜 기준 가장 가까운 미래로 해석한다.
- sourceUrl은 뉴스 기사, 팝가·헤이팝 등 팝업 정보 사이트, 브랜드 공식 페이지를 우선하고, 유튜브·인스타그램·예약 폼은 다른 출처가 없을 때만 쓴다.
- sourceUrl은 그 팝업을 직접 다루는 기사/페이지의 실제 URL이어야 한다. URL을 만들어내거나 사이트 메인 주소로 대체하지 않는다. 확인된 URL이 없는 팝업은 결과에서 제외한다.
- 이미 종료된 팝업, 위 목록과 중복되는 팝업은 제외한다.
- 브랜드·장소·날짜를 서로 다른 팝업의 정보와 섞지 않는다. 한 출처에 적힌 정보만으로 항목을 구성한다.
- 최대 8개.

출력: 설명 없이 JSON 배열만 출력한다. 각 원소 형식:
{"name": string, "brandName": string|null, "category": "FASHION"|"BEAUTY"|"FOOD"|"GOODS"|"EXHIBIT"|"ETC", "address": string, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"|null, "description": string (한국어 1~2문장, 광고 문구 제외), "sourceUrl": string}`;

    const apiCallPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const response = await withTimeout(apiCallPromise, TIMEOUT_MS, `그룹 ${groupKey} 호출이 25초를 초과하여 타임아웃되었습니다.`);
    const callElapsed = Date.now() - callStart;

    const raw = response.text || '';
    const cand0 = response.candidates?.[0];
    const metadata = cand0?.groundingMetadata;
    const queries = metadata?.webSearchQueries || [];
    const chunks = metadata?.groundingChunks || [];
    const domains: string[] = [];

    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.title) {
          domains.push(chunk.web.title);
        }
      }
    }

    const metadataGrounded = queries.length > 0 || (Array.isArray(chunks) && chunks.length > 0);

    // 파싱 시도
    let cleanText = raw.trim();
    if (cleanText.includes('```')) {
      cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    }

    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');

    let parsedArray: any[] = [];
    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      try {
        const parsed = JSON.parse(cleanText.substring(firstBracket, lastBracket + 1));
        if (Array.isArray(parsed)) {
          parsedArray = parsed;
        }
      } catch {
        // json parse error
      }
    }

    const items: RawCandidate[] = [];
    const invalidItems: Array<{ name: string; sourceUrl: string; detail: string }> = [];
    let redirectUrlCount = 0;

    for (const rawItem of parsedArray) {
      if (typeof rawItem?.sourceUrl === 'string' && rawItem.sourceUrl.includes(REDIRECT_SIGNATURE)) {
        redirectUrlCount++;
      }

      const parsed = candidateSchema.safeParse(rawItem);
      if (parsed.success) {
        items.push(parsed.data as RawCandidate);
      } else {
        const detailMsg = parsed.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
          .join(', ');
        invalidItems.push({
          name: typeof rawItem?.name === 'string' ? rawItem.name : '(이름 누락)',
          sourceUrl: typeof rawItem?.sourceUrl === 'string' ? rawItem.sourceUrl : '',
          detail: `[그룹 ${groupKey}] 스키마 검증 실패: ${detailMsg}`,
        });
      }
    }

    if (parsedArray.length === 0 && raw.includes(REDIRECT_SIGNATURE)) {
      redirectUrlCount = (raw.match(new RegExp(REDIRECT_SIGNATURE.replace(/\./g, '\\.'), 'g')) || []).length;
    }

    // 그룹별 grounded 판정: 중계 링크 1개 이상 (또는 메타데이터)
    const isGrounded = metadataGrounded || redirectUrlCount >= 1;

    return {
      group: groupKey,
      ok: isGrounded,
      parsed: items.length,
      redirectUrlCount,
      elapsedMs: callElapsed,
      error: isGrounded ? undefined : 'no_grounding (중계 링크 없음)',
      items: isGrounded ? items : [],
      invalidItems: isGrounded ? invalidItems : [],
      invalidCount: isGrounded ? invalidItems.length : 0,
      domains,
      queries,
      rawText: raw,
    };
  };

  // Promise.allSettled 병렬 실행
  const groupKeys = Object.keys(groups);
  const settledResults = await Promise.allSettled(
    groupKeys.map((k) => executeGroupCall(k, groups[k]))
  );

  const perCall: GroupCallResult[] = [];
  const allItems: RawCandidate[] = [];
  const allInvalidItems: Array<{ name: string; sourceUrl: string; detail: string }> = [];
  let totalInvalidCount = 0;
  const allDomains = new Set<string>();
  const allQueries = new Set<string>();
  const rawTextParts: string[] = [];

  for (let i = 0; i < groupKeys.length; i++) {
    const key = groupKeys[i];
    const res = settledResults[i];

    if (res.status === 'fulfilled') {
      const val = res.value;
      perCall.push({
        group: val.group,
        ok: val.ok,
        parsed: val.parsed,
        redirectUrlCount: val.redirectUrlCount,
        elapsedMs: val.elapsedMs,
        error: val.error,
      });

      if (val.ok) {
        allItems.push(...val.items);
        allInvalidItems.push(...val.invalidItems);
        totalInvalidCount += val.invalidCount;
        val.domains.forEach((d) => allDomains.add(d));
        val.queries.forEach((q) => allQueries.add(q));
      }
      rawTextParts.push(`--- 그룹 ${key} (${val.ok ? 'OK' : 'FAIL'}) ---\n${val.rawText}`);
    } else {
      let safeMsg = res.reason?.message || 'Unknown group call error';
      if (apiKey) {
        safeMsg = safeMsg.replaceAll(apiKey, '[REDACTED]');
      }
      perCall.push({
        group: key,
        ok: false,
        parsed: 0,
        redirectUrlCount: 0,
        elapsedMs: TIMEOUT_MS,
        error: safeMsg,
      });
      rawTextParts.push(`--- 그룹 ${key} (ERROR) ---\n${safeMsg}`);
    }
  }

  const combinedRawText = rawTextParts.join('\n\n');
  const grounded = perCall.some((c) => c.ok);

  return {
    items: allItems,
    groundingDomains: Array.from(allDomains),
    invalidCount: totalInvalidCount,
    invalidItems: allInvalidItems,
    grounded,
    retried: false,
    perCall,
    llm: {
      rawTextLength: combinedRawText.length,
      parseFailed: !grounded && allItems.length === 0,
      rawTextHead: combinedRawText.slice(0, 8000),
      webSearchQueries: Array.from(allQueries),
      groundingChunkCount: allDomains.size,
      groundingDomains: Array.from(allDomains),
    },
  };
}
