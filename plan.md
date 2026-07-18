# 팝업스토어맵 — plan.md

> 기준 문서: `architecture_research.md`, `wireframe_main.html`
> 규칙: 이 문서에 명시된 순서대로만 실행. "구현해" 명령 전까지 코드 작성 금지.
> 완료된 항목은 `[x]`로 갱신하며 진행.

---

## 0. 프로젝트 정보

- 프로젝트명(가칭): `popupmap`
- 저장소: 신규 Next.js 14 프로젝트 (App Router, TypeScript)
- 배포: Vercel (Seoul region), GitHub push → 자동배포
- 환경변수 관리: `.env.local` (커밋 제외), Vercel 대시보드에서 기존 변수 있으면 편집, 신규만 추가

---

## 1. 폴더 구조 (수정/생성될 파일 경로)

```
popupmap/
├── prisma/
│   └── schema.prisma                          # DB 스키마 정의
├── src/
│   ├── app/
│   │   ├── layout.tsx                         # 루트 레이아웃, 폰트 로드
│   │   ├── page.tsx                           # 메인 지도+리스트 화면 (와이어프레임 기준)
│   │   ├── globals.css                        # Tailwind + 커스텀 토큰(ink/paper/red/yellow/blue)
│   │   ├── admin/
│   │   │   ├── page.tsx                       # 관리자 로그인
│   │   │   └── submissions/page.tsx           # 제보 승인 큐
│   │   └── api/
│   │       ├── popups/route.ts                # GET 목록(반경검색), POST 관리자 직접입력
│   │       ├── popups/[id]/route.ts           # GET 상세
│   │       ├── submissions/route.ts           # POST 사용자 제보
│   │       └── admin/submissions/[id]/route.ts # PATCH 승인/반려
│   ├── components/
│   │   ├── map/
│   │   │   ├── KakaoMap.tsx                   # 카카오맵 SDK 래퍼
│   │   │   └── PopupPin.tsx                   # D-day 배지 핀 컴포넌트
│   │   ├── list/
│   │   │   ├── PopupCard.tsx                  # 와이어프레임의 카드 (stub 배지 포함)
│   │   │   └── FilterChips.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                    # 데스크톱 사이드바
│   │   │   └── MobileSheet.tsx                # 모바일 바텀시트
│   │   └── forms/
│   │       └── SubmissionForm.tsx             # 제보 폼
│   ├── lib/
│   │   ├── prisma.ts                          # Prisma client singleton
│   │   ├── kakao.ts                           # 카카오맵 API 유틸
│   │   └── status.ts                          # start/end_date → upcoming/ongoing/ended 계산
│   └── types/
│       └── popup.ts
├── .env.local                                  # (커밋 제외) DATABASE_URL, KAKAO_MAP_KEY 등
└── package.json
```

---

## 2. DB 스키마 (Prisma, architecture_research.md 3장 기준 확정본)

```prisma
model Popup {
  id           String    @id @default(uuid())
  name         String
  brandId      String?
  brand        Brand?    @relation(fields: [brandId], references: [id])
  description  String?
  category     Category
  address      String
  lat          Float
  lng          Float
  startDate    DateTime
  endDate      DateTime?
  status       Status    @default(upcoming)
  sourceType   SourceType
  sourceUrl    String?
  images       String[]
  isSponsored  Boolean   @default(false)
  viewCount    Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Brand {
  id               String   @id @default(uuid())
  name             String
  instagramHandle  String?
  contactEmail     String?
  isPartner        Boolean  @default(false)
  popups           Popup[]
}

model Submission {
  id                String   @id @default(uuid())
  popupData         Json
  submitterContact  String?
  status            SubStatus @default(pending)
  createdAt         DateTime @default(now())
}

enum Category { FASHION BEAUTY FOOD GOODS EXHIBIT ETC }
enum Status { upcoming ongoing ended }
enum SourceType { manual user_submit brand_official }
enum SubStatus { pending approved rejected }
```

---

## 3. API 명세

### `GET /api/popups`
쿼리: `lat, lng, radius(km), category?, status?`
응답:
```json
{
  "popups": [
    { "id": "...", "name": "탬버린즈 성수 플래그십", "category": "BEAUTY",
      "lat": 37.544, "lng": 127.055, "endDate": "2026-07-20",
      "status": "ongoing", "images": ["..."] }
  ]
}
```

### `GET /api/popups/[id]`
상세 단일 객체 반환 (설명, 전체 이미지, 브랜드 정보 포함)

### `POST /api/submissions`
요청 바디: `{ name, address, lat, lng, category, startDate, endDate, images[], submitterContact? }`
- rate limit: IP 기준 1일 5건
- 응답: `{ status: "pending", id }`

### `PATCH /api/admin/submissions/[id]`  (auth 필요)
요청: `{ action: "approve" | "reject" }`
- approve 시 `Submission.popupData` → `Popup` 테이블로 승격 트랜잭션

### `POST /api/popups`  (auth 필요, 관리자 시드 입력용)
요청 바디: `Popup` 필드 전체 (Day1 시드 100개 입력용 — 스크립트로 반복 호출 가능하게 설계)

---

## 4. 단계별 실행 순서 (원칙: DB/Auth 먼저, 그다음 프론트)

- [x] **STEP A** — 프로젝트 초기화: Next.js 뼈대(package.json, tsconfig, tailwind.config, next.config), globals.css(디자인 토큰), layout.tsx(폰트), page.tsx(플레이스홀더), prisma.ts(client 싱글톤), .env.local.example 생성 완료. **Supabase 프로젝트 생성/DATABASE_URL 연결은 라하님 결정 필요 — 아래 확인 참고**
- [x] **STEP B** — `prisma/schema.prisma` 작성 완료 (2장 스키마 그대로 반영, 인덱스 추가: lat/lng, status, category). `prisma migrate dev`는 라하님이 Supabase `DATABASE_URL` 전달 시 바로 실행
- [x] **STEP C** — 관리자 인증(NextAuth v5, Credentials Provider, middleware로 `/admin/*` 보호) + `/api/popups` POST(시드 입력용, zod 검증) 
- [ ] **STEP D** — 시드 데이터 50~100개 수동 입력 (architecture_research.md 4장 전략대로, 개발과 병행 진행)
- [ ] **STEP E** — `GET /api/popups` (반경검색) 구현
- [ ] **STEP F** — 프론트: `Sidebar.tsx`, `PopupCard.tsx`, `FilterChips.tsx` (wireframe_main.html 그대로 이식)
- [ ] **STEP G** — `KakaoMap.tsx` 연동 + `PopupPin.tsx` (D-day 배지)
- [ ] **STEP H** — 모바일 `MobileSheet.tsx` (wireframe의 바텀시트 드래그 로직 이식)
- [ ] **STEP I** — `SubmissionForm.tsx` + `POST /api/submissions`
- [ ] **STEP J** — 관리자 승인 큐 페이지 (`/admin/submissions`) + `PATCH` 연동
- [ ] **STEP K** — `status.ts` 배치 로직 → Vercel Cron 1일 1회 등록 (upcoming/ongoing/ended 자동 갱신)
- [ ] **STEP L** — Vercel 배포, 도메인 연결, 최종 QA

각 STEP 완료 시 git commit 포함해서 다음 STEP으로. STEP 단위를 벗어나는 범위 확장(회원가입, 결제, 좋아요 등)은 이 문서에 없으므로 실행하지 않음 — 필요하면 plan.md에 먼저 추가 후 진행.

---

## 5. Antigravity CLI 전달용 스코프 원칙

- 각 STEP은 별도 프롬프트로 분리해서 전달 (한 번에 여러 STEP 요청 금지 — 범위 확장 방지)
- 프롬프트는 한국어로 작성, 해당 STEP의 파일 경로를 명시적으로 지정
- "이 STEP 외 다른 파일은 건드리지 마" 문구를 각 프롬프트에 포함

---

**다음 단계**: 이 계획에 피드백 있으신가요? 없으면 "구현 시작해" 명령으로 STEP A부터 진행합니다.
