# 팝업스토어맵 — Architecture Research

> Source of Truth 문서. 이후 plan.md는 이 문서를 기준으로 작성됨.
> 원칙: 3일 내 배포 가능한 MVP, 서버비 최소화, 수익화는 나중이어도 구조는 처음부터 열어둔다.

---

## 1. 프로젝트 정의

**한 줄 정의**: 전국 팝업스토어 오픈/마감 일정을 지도+리스트로 큐레이션하는 웹 서비스 (야장맵과 동일 UX 패턴)

**핵심 차별점**: 네이버지도/인스타에 정보는 있지만 "지금 열려있는 것만" 필터링이 안 됨 → 팝업스토어맵이 그 필터 역할

**초기 수익모델**: 없음 (트래픽 우선). 단, DB 스키마에 `is_sponsored`, `brand_id` 필드는 처음부터 넣어서 나중에 라운드미디어 광고 상품 얹기 쉽게 설계.

**첫 고객(트래픽 기준)**: 팝업스토어 찾아다니는 2030 여성/MZ, 서울 성수·홍대·한남·잠실 밀집 지역 우선

---

## 2. 기술 스택 (가성비 + 확장성)

라하님 기존 스택과 동일하게 가서 신규 학습비용 0으로 갑니다.

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router, TS) | 기존 프로젝트와 동일, Vercel 배포 즉시 가능 |
| DB | Supabase (PostgreSQL) | 무료 티어로 MVP 충분, PostGIS 확장으로 위경도 쿼리 |
| ORM | Prisma 5.22.0 | 기존 표준 |
| 인증 | 관리자만 NextAuth (일반 유저는 비로그인 열람, 제보만 폼) | 초기엔 회원 시스템 자체가 오버엔지니어링 |
| 지도 | 카카오맵 JS SDK (무료 쿼터 큼) 또는 네이버지도 API | 국내 팝업 위치라 카카오맵이 UX 익숙도 高 |
| 스토리지 | Supabase Storage | 팝업 이미지 업로드 |
| 배포 | Vercel (Seoul region) | 기존 워크플로우 동일, GitHub push → 자동배포 |
| 이미지 최적화 | Next/Image + Supabase CDN | 별도 비용 없음 |
| 크롤링/수집 배치 | Vercel Cron + Node 스크립트 (주 2~3회) | 서버리스라 상시 서버비 없음 |

**서버비 추정**: Vercel 무료~Pro($20), Supabase 무료 티어(500MB DB, 1GB 스토리지)로 초기 3개월은 사실상 $0~20/월. 카카오맵 API도 일 30만 콜까지 무료.

---

## 3. DB 스키마

### `popups` (팝업스토어 메인)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| name | text | 팝업명 (예: "무신사 스탠다드 성수") |
| brand_id | uuid FK → brands (nullable) | 브랜드 연결, 나중에 광고주 매칭용 |
| description | text | |
| category | enum | 패션/뷰티/F&B/굿즈/전시형/기타 |
| address | text | |
| lat, lng | float | PostGIS geography 컬럼으로 실제 저장 (반경검색용) |
| start_date | date | |
| end_date | date | null이면 "상시" 처리 |
| status | enum | upcoming / ongoing / ended (배치로 자동 계산) |
| source_type | enum | manual(직접입력) / user_submit(제보) / brand_official(브랜드 제공) |
| source_url | text | 원본 인스타/보도자료 링크 (신뢰도 표시용) |
| images | text[] | Supabase Storage 경로 |
| is_sponsored | boolean default false | 향후 유료노출 필드 |
| view_count | int default 0 | |
| created_at, updated_at | timestamp | |

### `brands`
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| name | text | |
| instagram_handle | text | |
| contact_email | text | 나중에 세일즈 컨택용 |
| is_partner | boolean | 라운드미디어 기존 광고주 여부 플래그 |

### `submissions` (사용자 제보 큐)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| popup_data | jsonb | 제보 원본 (관리자가 검수 후 popups로 승격) |
| submitter_contact | text (nullable) | |
| status | enum | pending / approved / rejected |
| created_at | timestamp | |

### `admin_users`
- NextAuth 기반, 초기엔 라하님 단독 관리자 계정 1개로 시작

---

## 4. 데이터 수집 전략 (핵심 — 여기가 승부처)

야장맵이 초기 100곳을 손으로 넣고 제보로 확장한 것처럼, 3단계로 간다.

**1단계 — 시드 50~100개 (D-3 ~ D-1, MVP 오픈 전)**
- 인스타그램 해시태그 수동 서치: #팝업스토어 #성수팝업 #홍대팝업 #한남팝업 — 최근 1개월 게시물 훑으며 직접 입력
- 백화점/편집숍 공식 팝업 일정 페이지 취합: 더현대서울, 롯데타임빌라스, 무신사 스탠다드, 성수 에스팩토리 등은 자체 팝업 캘린더를 이미 공개함 → 스크래핑이 아니라 수동 열람 후 입력 (저작권/ToS 이슈 없음)
- 이 단계는 100% 수동, 자동화 시도하지 않는다 (품질이 첫인상을 결정하기 때문)

**2단계 — 사용자 제보 크라우드소싱 (오픈 후)**
- `submissions` 테이블 + 간단한 제보 폼 (사진, 위치, 기간만 받는 최소 필드)
- 관리자 승인 후 `popups`에 반영 (야장맵과 동일 구조 — 신뢰도 유지)
- 제보 유도 장치: "제보하면 상단 노출 우선권" 같은 게이미피케이션 요소는 plan.md 단계에서 UX로 설계

**3단계 — 라운드미디어 네트워크 활용 (차별화 포인트, 경쟁사가 못하는 부분)**
- 기존 광고대행 계약된 브랜드/클라이언트 중 팝업 운영 이력 있는 곳에 직접 컨택해서 `brand_official` 소스로 데이터 받기
- 이건 트래픽 확보용이 아니라, **나중에 브랜드 유료 등록으로 전환할 파이프라인을 지금부터 만드는 것**. 데이터 제공이 곧 영업 접점이 됨

**주의**: 인스타그램 자동 크롤링/스크래핑은 ToS 위반 리스크가 있어 배치 자동화 대상에서 제외. 수동 서치 + 제보 + 브랜드 협조로만 채운다. 자동화는 "이미 우리 DB에 있는 팝업의 종료일 체크" 같은 저위험 영역에만 적용.

---

## 5. API 설계 (초안)

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/popups?lat=&lng=&radius=&category=&status=` | 지도용 조회, PostGIS 반경검색 |
| GET | `/api/popups/[id]` | 상세 |
| POST | `/api/submissions` | 사용자 제보 (rate limit 필요) |
| GET | `/api/admin/submissions` | 관리자 승인 대기 큐 (auth 필요) |
| PATCH | `/api/admin/submissions/[id]` | 승인/반려 |
| POST | `/api/admin/popups` | 관리자 직접 입력 (시드 데이터용) |

status 계산은 클라이언트가 아니라 Vercel Cron(1일 1회)이 `start_date/end_date` 기준으로 배치 갱신 → 매 요청마다 계산 안 해도 됨.

---

## 6. MVP 범위 (3일 스코프 기준선)

- Day 1: DB 스키마 확정 + Supabase 세팅 + 시드 데이터 50개 수동 입력 시작
- Day 2: 지도 뷰(카카오맵) + 리스트 뷰 + 상세페이지, 반응형(모바일 우선, 야장맵처럼 모바일 최적화가 실사용의 대부분)
- Day 3: 제보 폼 + 관리자 승인 페이지(최소 기능) + 배포

이 범위 밖(회원가입, 리뷰, 좋아요, 브랜드 유료 등록 결제)은 전부 향후 파이프라인으로 분리.

---

## 7. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| 초기 DB 빈약 → 첫인상 실패 | 시드 100개 채울 때까지 오픈 안 함 (야장맵과 동일 원칙) |
| 종료된 팝업이 안 지워짐(정보 신뢰도 하락) | end_date 기반 자동 status 배치로 "종료됨" 명확히 표시, 삭제 대신 필터링만 |
| 경쟁 서비스 등장(카피캣) | 라운드미디어 네트워크발 브랜드 공식 데이터가 진입장벽 — 여긴 코드로 카피 안 됨 |
| 지도 API 비용 스파이크 | 카카오맵 무료 쿼터 내에서 캐싱(같은 반경 재조회 시 클라이언트 캐시) |

---

**다음 단계**: 이 문서 기준으로 `wireframe_main.html` (Step 2, 단일 HTML 와이어프레임) 진행할지, 바로 plan.md(Step 3)로 넘어갈지 확인 필요.
