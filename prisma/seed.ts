import 'dotenv/config';
import { PrismaClient, Category, Status, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_DATA = [
  {
    name: "피스마이너스원 x 토이스토리 <더 퍼스트 팬>",
    brand: "피스마이너스원",
    category: "FASHION",
    address: "서울 성동구 연무장길 27",
    startDate: "2026-07-01", endDate: "2026-08-31", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.ktnews.com/news/articleView.html?idxno=146869",
    description: "지드래곤의 피스마이너스원과 디즈니·픽사 토이스토리 협업 팝업, 데이지 모티프 컬래버 상품"
  },
  {
    name: "로스트아크 x 무신사 모코코 스트릿 팝업 in 성수",
    brand: "무신사",
    category: "GOODS",
    address: "무신사 스토어 성수",
    startDate: "2026-07-22", endDate: "2026-07-31", status: "upcoming",
    sourceType: "manual",
    sourceUrl: "https://lostark.game.onstove.com/Event/Collaboration/260708",
    description: "로스트아크 모코코 캐릭터 굿즈샵, 네이버 사전예약 필요"
  },
  {
    name: "T1 암행천문: 별을 헤다",
    brand: "T1",
    category: "EXHIBIT",
    address: "티팩토리 성수",
    startDate: "2026-07-02", endDate: "2026-09-13", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.ktnews.com/news/articleView.html?idxno=146869",
    description: "T1 역대 우승 트로피와 선수 실착 유니폼 전시, 체험 프로그램"
  },
  {
    name: "요아정 x 박뚜기 소금빵 콜라보",
    brand: "요아정",
    category: "FOOD",
    address: "서울 성동구 연무장길 33 박뚜기 소금빵 성수 본점",
    startDate: "2026-07-07", endDate: "2026-08-07", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://biz.heraldcorp.com/article/10799734",
    description: "요아정 벌집꿀 츄러스, 요아정 초코쉘 츄러스 한정 메뉴"
  },
  {
    name: "나스 인세이셔블 리퀴드 블러쉬 팝업",
    brand: "나스",
    category: "BEAUTY",
    address: "무신사 메가스토어 성수 1층",
    startDate: "2026-07-11", endDate: "2026-07-24", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.sisunnews.co.kr/news/articleView.html?idxno=242263",
    description: "나스 신제품 리퀴드 블러쉬 체험존, 컬러플레이존"
  },
  {
    name: "토니모리 20주년 언커먼 팩토리",
    brand: "토니모리",
    category: "BEAUTY",
    address: "서울 성동구 연무장길 99",
    startDate: "2026-07-17", endDate: "2026-07-26", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.cosinkorea.com/news/article.html?no=57841",
    description: "토니모리 창립 20주년 헤리티지 공간, 키츠샵 협업 틴트 선론칭"
  },
  {
    name: "더콜디스트모먼트 2026 SUMMER FLEA MARKET",
    brand: "더콜디스트모먼트",
    category: "FASHION",
    address: "더콜디스트모먼트 성수 플래그십 스토어",
    startDate: "2026-07-16", endDate: "2026-07-19", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://fashionbiz.co.kr/article/227847",
    description: "볼캡, 백팩 등 시즌오프 플리마켓"
  },
  {
    name: "아노에틱 뷰티 말차 웰니스 뷰티 팝업",
    brand: "아노에틱 뷰티",
    category: "BEAUTY",
    address: "서울 성동구 성수이로14길 15 엘레멘츠",
    startDate: "2026-07-10", endDate: "2026-07-19", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.thepublic.kr/news/articleView.html?idxno=310512",
    description: "아노에틱 뷰티 첫 오프라인 팝업, 말차 스킨케어 라인"
  },
  {
    name: "K-헤리티지 팝업 (국가유산청 x 내셔널지오그래픽)",
    brand: "국가유산청 x 내셔널지오그래픽",
    category: "EXHIBIT",
    address: "서울 영등포구 여의대로 108 더현대 서울",
    startDate: "2026-07-16", endDate: "2026-07-22", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.hankyung.com/article/202607169050g",
    description: "훈민정음·민화·자개 모티프 K-헤리티지 컬렉션"
  },
  {
    name: "스파이더맨: 브랜드 뉴 데이 - 친절한 이웃 팝업",
    brand: "소니픽처스",
    category: "EXHIBIT",
    address: "서울 영등포구 여의대로 108 더현대 서울 5층 에픽 서울",
    startDate: "2026-07-19", endDate: "2026-08-04", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.etnews.com/20260715000123",
    description: "영화 스파이더맨 친절한 이웃 체험형 팝업, 3개 공간 포토존"
  },
  {
    name: "빤쮸토끼 팝업 IN 더현대서울",
    brand: "빤쮸토끼",
    category: "GOODS",
    address: "서울 영등포구 여의대로 108 더현대 서울 지하2층 아이코닉",
    startDate: "2026-07-02", endDate: "2026-07-15", status: "ended",
    sourceType: "manual",
    sourceUrl: "https://www.dayforyou.com/getScheduleList?keyword=더현대서울&status=all",
    description: "빤쮸토끼 복각 에디션 마켓"
  },
  {
    name: "아리땁다, 아리수",
    brand: "서울아리수본부",
    category: "ETC",
    address: "여의도한강공원 이벤트광장",
    startDate: "2026-06-19", endDate: "2026-07-09", status: "ended",
    sourceType: "manual",
    sourceUrl: "https://www.mt.co.kr/policy/2026/06/17/2026061709521629188",
    description: "아리수 8개 테마존, 리필존, 힐링존"
  },
  {
    name: "귀멸의 칼날 무한성편 팝업스토어",
    brand: "귀멸의 칼날",
    category: "GOODS",
    address: "서울 마포구 양화로 188 AK PLAZA 홍대 4층 LIMITION",
    startDate: "2026-07-07", endDate: "2026-08-02", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://popga.co.kr/content/magazine/352",
    description: "무한성편 극장판 재개봉 기념 굿즈샵"
  },
  {
    name: "체인소맨: 레제 콜라보 카페",
    brand: "체인소맨",
    category: "FOOD",
    address: "서울 마포구 양화로 188 AK PLAZA 홍대 3층 BOX cafe&space",
    startDate: "2026-05-22", endDate: "2026-07-19", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.thetrippick.com/news/articleView.html?idxno=3861",
    description: "레제·마키마·덴지 테마 메뉴, 캐릭터 카드 랜덤 증정"
  },
  {
    name: "주술회전 PLAZA in 서울 홍대",
    brand: "주술회전 (MAPPA x SMG)",
    category: "GOODS",
    address: "서울 마포구 양화로 188 AK PLAZA 홍대 2층",
    startDate: "2026-06-19", endDate: "2026-07-16", status: "ended",
    sourceType: "manual",
    sourceUrl: "https://www.dayforyou.com/getDetail?scheduleSeq=25635",
    description: "MAPPA x SMG 공식 콜라보, 한정 MD"
  },
  {
    name: "명탐정 코난 할로윈의 웨딩 미스터리",
    brand: "명탐정 코난",
    category: "EXHIBIT",
    address: "서울 마포구 홍익로2길 7 B1층",
    startDate: "2026-07-17", endDate: "2026-08-30", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://popply.co.kr/popup/5192",
    description: "체험형 추리게임, 코난과 헤이지 협력 미션"
  },
  {
    name: "윈드브레이커 5주년 작화전",
    brand: "윈드브레이커",
    category: "EXHIBIT",
    address: "서울 마포구 양화로 188 AK 플라자 홍대 3층 Space Galleria",
    startDate: "2026-07-09", endDate: "2026-08-23", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.dayforyou.com/getScheduleList?keyword=AK플라자홍대&status=all",
    description: "네이버 웹툰 윈드브레이커 연재 5주년 작화 특별전"
  },
  {
    name: "CLAMP展 -SELECTION-",
    brand: "CLAMP",
    category: "EXHIBIT",
    address: "서울 마포구 양화로 188 AK PLAZA 홍대 4층 오뮤지엄",
    startDate: "2026-04-16", endDate: "2026-07-19", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://www.musinsa.com/content/1478920730378400810",
    description: "CLAMP 데뷔 35주년 기념 원화 전시, 해외 최초 전시"
  },
  {
    name: "HERE 와쿠쿠 한국 첫 팝업",
    brand: "HERE(히얼)",
    category: "GOODS",
    address: "서울 용산구 한강대로23길 55 아이파크몰 용산점 6층",
    startDate: "2026-07-03", endDate: "2026-09-28", status: "ongoing",
    sourceType: "manual",
    sourceUrl: "https://biz.heraldcorp.com/article/10804656",
    description: "중국 아트토이 브랜드 히얼의 와쿠쿠·시이노노·아오 캐릭터 국내 첫 팝업"
  }
];

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
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
    } else {
      console.error(`주소 검색 API 에러: ${addrRes.status} ${addrRes.statusText}`);
      console.error(await addrRes.text());
    }
  } catch (error: any) {
    console.error(`주소 검색 요청 실패: ${error?.message || error}`);
  }

  // 2. 키워드 검색
  try {
    const keywordRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`, { headers });
    if (keywordRes.ok) {
      const data = await keywordRes.json();
      if (data.documents && data.documents.length > 0) {
        return {
          lat: parseFloat(data.documents[0].y),
          lng: parseFloat(data.documents[0].x),
        };
      }
    } else {
      console.error(`키워드 검색 API 에러: ${keywordRes.status} ${keywordRes.statusText}`);
      console.error(await keywordRes.text());
    }
  } catch (error: any) {
    console.error(`키워드 검색 요청 실패: ${error?.message || error}`);
  }

  return null;
}

async function main() {
  let inserted = 0;
  let geocodeFailed = 0;

  for (const item of SEED_DATA) {
    const coords = await geocode(item.address);
    if (!coords) {
      console.warn(`지오코딩 실패: ${item.name}`);
      geocodeFailed++;
      continue;
    }

    let brand = await prisma.brand.findFirst({
      where: { name: item.brand },
    });

    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: item.brand },
      });
    }

    await prisma.popup.create({
      data: {
        name: item.name,
        brandId: brand.id,
        category: item.category as Category,
        address: item.address,
        lat: coords.lat,
        lng: coords.lng,
        startDate: new Date(item.startDate),
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        status: item.status as Status,
        sourceType: item.sourceType as SourceType,
        sourceUrl: item.sourceUrl,
        description: item.description,
      },
    });

    inserted++;
  }

  console.log(`${inserted}개 삽입, ${geocodeFailed}개 지오코딩 실패`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
