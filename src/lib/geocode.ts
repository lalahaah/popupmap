export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.warn("KAKAO_REST_API_KEY가 설정되어 있지 않습니다.");
    return null;
  }

  const headers = { Authorization: `KakaoAK ${apiKey}` };

  // 1. 주소 검색
  try {
    const addrRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, { headers });
    if (addrRes.ok) {
      const data = await addrRes.json();
      if (data.documents && data.documents.length > 0) {
        return {
          lat: parseFloat(data.documents[0].y),
          lng: parseFloat(data.documents[0].x),
        };
      }
    }
  } catch (error) {
    console.error(`주소 검색 요청 실패:`, error);
  }

  // 2. 키워드 검색
  try {
    const searchKeyword = address.replace(/\s+[B\d]+층.*/, '');
    const keywordRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchKeyword)}`, { headers });
    if (keywordRes.ok) {
      const data = await keywordRes.json();
      if (data.documents && data.documents.length > 0) {
        return {
          lat: parseFloat(data.documents[0].y),
          lng: parseFloat(data.documents[0].x),
        };
      }
    }
  } catch (error) {
    console.error(`키워드 검색 요청 실패:`, error);
  }

  return null;
}
