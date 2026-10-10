import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { GEMINI_MODEL, WINDOW_DAYS, MAX_CANDIDATES, REGION_FOCUS } from './config';

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

export interface LlmDiagInfo {
  rawTextLength: number;
  parseFailed: boolean;
  rawTextHead: string;
  webSearchQueries: string[];
  groundingChunkCount: number;
  groundingDomains: string[];
}

export interface CollectRawCandidatesResult {
  items: RawCandidate[];
  groundingDomains: string[];
  rawText: string;
  parseError?: boolean;
  invalidCount: number;
  invalidItems?: Array<{ name: string; sourceUrl: string; detail: string }>;
  llm: LlmDiagInfo;
  grounded: boolean;
  retried: boolean;
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

  const basePrompt = `오늘 날짜: ${todayKst} (한국 시간)

[필수 절차]
답하기 전에 반드시 Google 검색 도구로 아래 검색을 각각 수행한다.
검색을 수행하지 않고 기억만으로 답하지 않는다. 검색 결과에서 확인되지 않은 팝업은 쓰지 않는다.
검색어:
- ${currentMonthLabel} 성수 팝업스토어
- ${currentMonthLabel} 더현대 서울 팝업스토어
- ${currentMonthLabel} 홍대 팝업스토어
- ${currentMonthLabel} 한남 용산 팝업스토어
- ${currentMonthLabel} 강남 잠실 팝업스토어
- 팝가 ${currentMonthLabel} 팝업 오픈 예정
- ${nextMonthLabel} 서울 팝업스토어 오픈 예정

너는 한국 팝업스토어 정보를 조사하는 리서처다. Google 검색을 사용해서, 지금 진행 중이거나 앞으로 ${WINDOW_DAYS}일 안에 시작하는 팝업스토어를 찾아라.

우선 참고할 출처: 성수동고릴라(seongsudonggorilla.com), 팝가(popga.co.kr), 데이포유(dayforyou.com), 브랜드 공식 채널/보도자료, 언론 기사.
지역: 전국. 단 ${REGION_FOCUS}를 우선 찾아라.

이미 등록된 팝업 (중복이므로 제외):
${existingNames.length > 0 ? existingNames.join('\n') : '(등록된 팝업 없음)'}

규칙:
- 검색으로 확인된 사실만 쓴다. 확인하지 못한 값은 null. 추측·창작 금지.
- name은 출처에 적힌 공식 팝업명 그대로 쓴다. 요약·합성·수식어 추가 금지.
- 날짜는 연도까지 확인해서 YYYY-MM-DD로 쓴다. 출처에 연도가 없으면 오늘 날짜 기준 가장 가까운 미래로 해석한다.
- sourceUrl은 그 팝업을 직접 다루는 기사/페이지의 실제 URL이어야 한다. URL을 만들어내거나 사이트 메인 주소로 대체하지 않는다. 확인된 URL이 없는 팝업은 결과에서 제외한다.
- 이미 종료된 팝업, 위 목록과 중복되는 팝업은 제외한다.
- 브랜드·장소·날짜를 서로 다른 팝업의 정보와 섞지 않는다. 한 출처에 적힌 정보만으로 항목을 구성한다.
- 최대 ${MAX_CANDIDATES}개.

출력: 설명 없이 JSON 배열만 출력한다. 각 원소 형식:
{"name": string, "brandName": string|null, "category": "FASHION"|"BEAUTY"|"FOOD"|"GOODS"|"EXHIBIT"|"ETC", "address": string, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"|null, "description": string (한국어 1~2문장, 광고 문구 제외), "sourceUrl": string}`;

  const ai = new GoogleGenAI({ apiKey });

  const executeCall = async (contentPrompt: string) => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: contentPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const raw = response.text || '';
    const metadata = response.candidates?.[0]?.groundingMetadata;
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

    const isGrounded = queries.length > 0 || (Array.isArray(chunks) && chunks.length > 0);

    return {
      rawText: raw,
      webSearchQueries: queries,
      groundingChunkCount: Array.isArray(chunks) ? chunks.length : 0,
      groundingDomains: domains,
      grounded: isGrounded,
    };
  };

  let callResult: Awaited<ReturnType<typeof executeCall>>;
  let retried = false;

  try {
    callResult = await executeCall(basePrompt);

    // grounded 가드: 검색이 수행되지 않았으면 1회 재시도
    if (!callResult.grounded) {
      retried = true;
      const retryPrompt = `${basePrompt}\n\n[재시도] 직전 응답은 검색 없이 작성되어 폐기되었다. 반드시 Google 검색을 수행한 뒤 다시 답하라.`;
      callResult = await executeCall(retryPrompt);
    }
  } catch (error: any) {
    let safeMessage = error?.message || 'Unknown error during Gemini call';
    if (apiKey) {
      safeMessage = safeMessage.replaceAll(apiKey, '[REDACTED]');
    }
    throw new Error(`Gemini generateContent failed: ${safeMessage}`);
  }

  const makeLlmDiag = (parseFailed: boolean): LlmDiagInfo => ({
    rawTextLength: callResult.rawText.length,
    parseFailed,
    rawTextHead: callResult.rawText.slice(0, 3000),
    webSearchQueries: callResult.webSearchQueries,
    groundingChunkCount: callResult.groundingChunkCount,
    groundingDomains: callResult.groundingDomains,
  });

  // 재시도 후에도 grounded가 false이면 모든 후보 폐기
  if (!callResult.grounded) {
    return {
      items: [],
      groundingDomains: callResult.groundingDomains,
      rawText: callResult.rawText,
      parseError: false,
      invalidCount: 0,
      invalidItems: [],
      llm: makeLlmDiag(false),
      grounded: false,
      retried,
    };
  }

  // 응답 파싱
  let cleanText = callResult.rawText.trim();
  if (cleanText.includes('```')) {
    cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  }

  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');

  if (firstBracket === -1 || lastBracket === -1 || firstBracket >= lastBracket) {
    return {
      items: [],
      groundingDomains: callResult.groundingDomains,
      rawText: callResult.rawText,
      parseError: true,
      invalidCount: 0,
      llm: makeLlmDiag(true),
      grounded: true,
      retried,
    };
  }

  const jsonSlice = cleanText.substring(firstBracket, lastBracket + 1);
  let parsedArray: any[];
  try {
    parsedArray = JSON.parse(jsonSlice);
    if (!Array.isArray(parsedArray)) {
      return {
        items: [],
        groundingDomains: callResult.groundingDomains,
        rawText: callResult.rawText,
        parseError: true,
        invalidCount: 0,
        llm: makeLlmDiag(true),
        grounded: true,
        retried,
      };
    }
  } catch {
    return {
      items: [],
      groundingDomains: callResult.groundingDomains,
      rawText: callResult.rawText,
      parseError: true,
      invalidCount: 0,
      llm: makeLlmDiag(true),
      grounded: true,
      retried,
    };
  }

  const items: RawCandidate[] = [];
  const invalidItems: Array<{ name: string; sourceUrl: string; detail: string }> = [];
  let invalidCount = 0;

  for (const rawItem of parsedArray) {
    const parsed = candidateSchema.safeParse(rawItem);
    if (parsed.success) {
      items.push(parsed.data as RawCandidate);
    } else {
      invalidCount++;
      const detailMsg = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join(', ');
      invalidItems.push({
        name: typeof rawItem?.name === 'string' ? rawItem.name : '(이름 누락)',
        sourceUrl: typeof rawItem?.sourceUrl === 'string' ? rawItem.sourceUrl : '',
        detail: `스키마 검증 실패: ${detailMsg}`,
      });
    }
  }

  return {
    items,
    groundingDomains: callResult.groundingDomains,
    rawText: callResult.rawText,
    parseError: false,
    invalidCount,
    invalidItems,
    llm: makeLlmDiag(false),
    grounded: true,
    retried,
  };
}
