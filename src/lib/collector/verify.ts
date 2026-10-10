import { RawCandidate } from './llm';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES } from './config';

export type VerificationLevel = 'verified' | 'name_only' | 'unreadable' | 'mismatch';

export interface VerificationResult {
  level: VerificationLevel;
  detail: string;
  finalUrl?: string;
}

// 일반어 토큰 목록 (이름 매칭에서 제외)
const STOP_WORDS = new Set([
  '팝업',
  '팝업스토어',
  '스토어',
  'popup',
  'pop-up',
  'in',
  '오픈',
  '한정',
]);

/**
 * URL이 Vertex AI Search 리다이렉트 호스트인지 검사
 */
export function isVertexAiHost(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase() === 'vertexaisearch.cloud.google.com';
  } catch {
    return false;
  }
}

/**
 * URL이 google.com 계열 호스트인지 검사
 */
export function isGoogleHost(urlString?: string): boolean {
  if (!urlString) return true;
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    return (
      host === 'vertexaisearch.cloud.google.com' ||
      host === 'google.com' ||
      host.endsWith('.google.com')
    );
  } catch {
    return true;
  }
}

/**
 * SSRF 방어: URL 및 호스트 유효성 검사
 * 
 * 한계 주석:
 * Node.js fetch 환경에서 커스텀 DNS resolver 없이 호스트네임 기반 fetch를 수행하므로,
 * Time-of-Check to Time-of-Use 사이의 DNS 리바인딩(DNS Rebinding) 공격은
 * 완전하게 막지 못한다는 한계가 있습니다.
 */
function isSafeUrl(urlString: string): { safe: boolean; reason?: string; parsedUrl?: URL } {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // 1. 프로토콜 검사: http / https만 허용
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { safe: false, reason: `Disallowed protocol: ${url.protocol}` };
  }

  // 2. 포트 검사: 기본 포트(80, 443 또는 비어있음)만 허용
  if (url.port) {
    if (url.protocol === 'http:' && url.port !== '80') {
      return { safe: false, reason: `Disallowed port for http: ${url.port}` };
    }
    if (url.protocol === 'https:' && url.port !== '443') {
      return { safe: false, reason: `Disallowed port for https: ${url.port}` };
    }
  }

  // 3. 호스트 검사: localhost, *.local, *.internal
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0.0.0.0'
  ) {
    return { safe: false, reason: `Disallowed internal hostname: ${hostname}` };
  }

  // 4. IP 주소 검사 (IPv4 및 IPv6)
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, o1, o2, o3, o4] = ipv4Match.map(Number);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) {
      return { safe: false, reason: 'Invalid IPv4 address' };
    }
    // 루프백 (127.0.0.0/8), 0.0.0.0/8
    if (o1 === 127 || o1 === 0) {
      return { safe: false, reason: 'Loopback IPv4 address' };
    }
    // 사설 IP (10.0.0.0/8)
    if (o1 === 10) {
      return { safe: false, reason: 'Private IPv4 address (10.0.0.0/8)' };
    }
    // 사설 IP (172.16.0.0/12: 172.16 - 172.31)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) {
      return { safe: false, reason: 'Private IPv4 address (172.16.0.0/12)' };
    }
    // 사설 IP (192.168.0.0/16)
    if (o1 === 192 && o2 === 168) {
      return { safe: false, reason: 'Private IPv4 address (192.168.0.0/16)' };
    }
    // 링크로컬 (169.254.0.0/16)
    if (o1 === 169 && o2 === 254) {
      return { safe: false, reason: 'Link-local IPv4 address (169.254.0.0/16)' };
    }
  }

  // IPv6 검사
  const cleanIpv6 = hostname.replace(/^\[|\]$/g, '');
  if (
    cleanIpv6 === '::1' ||
    cleanIpv6.startsWith('fc') ||
    cleanIpv6.startsWith('fd') || // fc00::/7
    cleanIpv6.startsWith('fe80') // fe80::/10
  ) {
    return { safe: false, reason: 'Private/Loopback IPv6 address' };
  }

  return { safe: true, parsedUrl: url };
}

/**
 * HTML 정리 및 디코딩
 */
function cleanHtml(rawHtml: string): string {
  // script 및 style 태그 및 내부 내용 제거
  let text = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // 모든 HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ');

  // 기본 HTML 엔티티 디코딩
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 연속 공백 정리
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 텍스트 정규화: 소문자화 및 한글/영문/숫자만 남김
 */
function normalizeText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

/**
 * 날짜 표기 변형들 생성
 * 예: 2026-05-12 -> [5월 12일, 05.12, 5.12, 2026.05.12, 2026-05-12, 05/12, 5/12]
 */
function generateDateVariants(dateStr: string): string[] {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return [dateStr];

  const [year, monthStr, dayStr] = parts;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(month) || isNaN(day)) return [dateStr];

  return [
    `${month}월 ${day}일`,
    `${month}월${day}일`,
    `${monthStr}.${dayStr}`,
    `${month}.${day}`,
    `${year}.${monthStr}.${dayStr}`,
    `${year}-${monthStr}-${dayStr}`,
    `${monthStr}/${dayStr}`,
    `${month}/${day}`,
  ];
}

export async function verifyCandidate(candidate: RawCandidate): Promise<VerificationResult> {
  // 1. SSRF 1차 검사
  const initialCheck = isSafeUrl(candidate.sourceUrl);
  if (!initialCheck.safe) {
    return {
      level: 'unreadable',
      detail: `SSRF 차단: ${initialCheck.reason}`,
      finalUrl: undefined,
    };
  }

  let htmlText = '';
  let finalUrl: string | undefined = undefined;
  let httpStatus: number | undefined = undefined;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(candidate.sourceUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PopupMapBot/1.0; +https://www.popupmap.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    httpStatus = res.status;
    if (res.url) {
      finalUrl = res.url;
      // 2. 리다이렉트 후 최종 URL(res.url)에 대해 SSRF 2차 검사
      const redirectCheck = isSafeUrl(res.url);
      if (!redirectCheck.safe) {
        return {
          level: 'unreadable',
          detail: `리다이렉트 SSRF 차단 (HTTP ${res.status}): ${redirectCheck.reason}`,
          finalUrl,
        };
      }
    }

    if (!res.ok) {
      return {
        level: 'unreadable',
        detail: `HTTP 상태 코드 에러: ${res.status}`,
        finalUrl,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) {
      return {
        level: 'unreadable',
        detail: `비HTML 응답 (HTTP ${res.status}): ${contentType}`,
        finalUrl,
      };
    }

    // 최대 MAX_HTML_BYTES까지만 본문 읽기
    if (res.body) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalBytes += value.length;
          if (totalBytes >= MAX_HTML_BYTES) {
            reader.cancel();
            break;
          }
        }
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const decoder = new TextDecoder('utf-8');
      htmlText = decoder.decode(combined);
    } else {
      const rawText = await res.text();
      htmlText = rawText.slice(0, MAX_HTML_BYTES);
    }
  } catch (error: any) {
    return {
      level: 'unreadable',
      detail: `페이지 가져오기 실패: ${error?.message || '네트워크 오류'}`,
      finalUrl: undefined,
    };
  }

  // 3. HTML 정리 및 본문 텍스트 추출
  const bodyText = cleanHtml(htmlText);
  if (bodyText.length < 300) {
    return {
      level: 'unreadable',
      detail: `본문 텍스트 길이 부족 (${bodyText.length}자 < 300자, HTTP ${httpStatus ?? 200})`,
      finalUrl,
    };
  }

  const normalizedBody = normalizeText(bodyText);

  // 4. 이름 일치 판정
  const rawTokens = candidate.name.split(/[ \t\nx×:\-·]+/i);
  const validTokens = rawTokens.filter((token) => {
    const trimmed = token.trim();
    if (trimmed.length < 2) return false;
    if (STOP_WORDS.has(trimmed.toLowerCase())) return false;
    return true;
  });

  const matchedTokens: string[] = [];
  for (const token of validTokens) {
    const normToken = normalizeText(token);
    if (normToken.length >= 2 && normalizedBody.includes(normToken)) {
      matchedTokens.push(token);
    }
  }

  let nameMatched = false;

  if (validTokens.length === 0) {
    const normName = normalizeText(candidate.name);
    if (normName.length >= 2 && normalizedBody.includes(normName)) {
      nameMatched = true;
      matchedTokens.push(candidate.name);
    }
  } else {
    if (matchedTokens.length / validTokens.length >= 0.5) {
      nameMatched = true;
    }
  }

  if (!nameMatched && candidate.brandName) {
    const normBrand = normalizeText(candidate.brandName);
    if (normBrand.length >= 2 && normalizedBody.includes(normBrand)) {
      nameMatched = true;
      matchedTokens.push(candidate.brandName);
    }
  }

  // 읽을 수 있는 본문인데 이름 불일치 -> mismatch
  if (!nameMatched) {
    const bodyHead = bodyText.slice(0, 200);
    return {
      level: 'mismatch',
      detail: `이름 미확인 (본문 ${bodyText.length}자, HTTP ${httpStatus ?? 200}) | 이름 토큰: [${validTokens.join(', ')}] | 본문에서 찾은 토큰: [${matchedTokens.join(', ')}] | 본문 앞 200자: "${bodyHead}"`,
      finalUrl,
    };
  }

  // 5. 날짜 일치 판정
  const dateVariants: string[] = [];
  if (candidate.startDate) {
    dateVariants.push(...generateDateVariants(candidate.startDate));
  }
  if (candidate.endDate) {
    dateVariants.push(...generateDateVariants(candidate.endDate));
  }

  let dateMatched = false;
  for (const variant of dateVariants) {
    if (bodyText.includes(variant) || normalizedBody.includes(normalizeText(variant))) {
      dateMatched = true;
      break;
    }
  }

  if (dateMatched) {
    return {
      level: 'verified',
      detail: `이름 및 일정 모두 본문에서 확인됨 (본문 ${bodyText.length}자, HTTP ${httpStatus ?? 200})`,
      finalUrl,
    };
  }

  return {
    level: 'name_only',
    detail: `이름 확인됨, 일정 표기 미확인 (본문 ${bodyText.length}자, HTTP ${httpStatus ?? 200})`,
    finalUrl,
  };
}
