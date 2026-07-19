# AGENTS.md — popupmap 프로젝트 컨텍스트

> 이 파일은 Antigravity CLI(Gemini)가 세션마다 참고할 지속 컨텍스트입니다.
> Source of Truth는 `plan.md`이며, 이 파일은 그 요약본 + 현재 진행상황입니다.
> **중요**: 각 프롬프트로 지시된 STEP과 파일 경로 외에는 절대 건드리지 마세요.

---

## 프로젝트 개요

- 이름: 팝업맵 (popupmap)
- 한 줄 정의: 전국 팝업스토어 오픈/마감 일정을 지도+리스트로 큐레이션하는 웹 서비스
- 참고 레퍼런스: 야장맵.kr (동일 UX 패턴 — 사이드바 리스트 + 지도, 모바일은 바텀시트)
- 디자인 시그니처: 팝업의 시한부성을 표현하는 "티켓 스텁 D-day 배지"(D-2, NEW, 마감임박)
- 초기 수익모델: 없음(트래픽 우선), 단 `Popup.isSponsored`, `Brand.isPartner` 필드로 향후 광고 확장 여지 열어둠

## 기술 스택

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS (토큰: ink #16171B, paper #FAFAF7, brandRed #FF3D57, brandYellow #FFC700, brandBlue #4C6FFF)
- Supabase (PostgreSQL) + Prisma 5.22.0
- NextAuth (관리자 전용, 일반 유저는 비로그인)
- 카카오맵 JS SDK
- Vercel 배포 (Seoul region)

## 현재 진행 상황

- [x] STEP A — Next.js 뼈대, tailwind/tsconfig/next.config, globals.css(디자인 토큰), layout.tsx(폰트: Archivo Black/IBM Plex Mono/Noto Sans KR), page.tsx(플레이스홀더), lib/prisma.ts, .env.local.example
- [x] STEP B — `prisma/schema.prisma` 작성 완료 (Popup/Brand/Submission 모델, 인덱스: lat/lng, status, category). **`DATABASE_URL`(pooler, 6543) + `DIRECT_URL`(direct, 5432) 분리 설정 — Vercel 서버리스 커넥션 고갈 방지, ViewPoint에서 겪은 이슈 선제 대응.** `prisma migrate dev`는 Supabase 프로젝트 생성 후 진행
- [x] STEP C — 관리자 인증(NextAuth v5, Credentials Provider, middleware 보호) + 시드 입력용 API(`POST /api/popups`, zod 검증)
- [x] STEP D — 시드 데이터 50~100개 수동 입력
- [x] STEP E — GET /api/popups 반경검색 구현 완료 (Haversine, category/status 필터). curl로 실제 검증 완료 (5km 반경 8건, BEAUTY 필터 3건 정확히 반환)
- [x] STEP F — Sidebar/PopupCard/FilterChips 구현 + 디자인 토큰(색상/폰트) 완전 적용 완료. 실제 API 데이터 8건 렌더링, 주소 필드 정상 표시, Archivo Black 폰트 및 브랜드 컬러(옐로/레드/블루) 육안+devtools 검증 완료.
- [x] STEP G — 카카오맵 연동 완료. D-day 배지 마커 정상 표시, 리스트-지도 데이터 동기화 확인.
      **디버깅 노트**: 지도가 안 보이던 근본 원인은 Kakao API/SDK 문제가 아니라, 
      page.tsx 최상위 컨테이너가 퍼센트 기반(h-full)이라 body/html에 명시적 높이가 
      없어 전체 높이 체인이 0으로 계산된 것. h-screen(뷰포트 고정)으로 교체 후 해결.
      앞으로 전체 화면 레이아웃 컴포넌트는 h-full 대신 h-screen을 최상위에 
      명시하는 걸 기본으로 할 것.
- [x] STEP H-0 — 팝업 상세 뷰 완료. 카드/마커 클릭 시 상세 패널(설명/주소/기간/원문링크) 표시, 닫기(X/배경클릭) 정상 작동 확인.
- [x] STEP H — 모바일 바텀시트 구현 완료 (드래그 제스처 포함)
- [x] STEP H-1 — 지도 터치 드래그 차단 문제 수정
- [x] STEP H-2 — 바텀시트 드래그 제스처 추가
- [ ] STEP I — 제보 폼 + API
- [ ] STEP J — 관리자 승인 큐 페이지
- [ ] STEP K — status 자동 갱신 배치 (Vercel Cron)
- [ ] STEP L — 배포 & QA

전체 API 명세, DB 스키마 상세, 폴더 구조는 `plan.md` 참고.

## 작업 규칙

1. 한 번에 하나의 STEP만 진행. 범위를 벗어나는 파일 수정 금지.
2. STEP 완료 시 git commit + push까지 포함 (별도 요청 아님, 매 STEP 프롬프트에 기본 포함된 작업). 커밋 메시지는 `STEP X: 설명` 형식 고정.
3. **푸시 전 보안 체크리스트 (매번 필수, 생략 금지)**:
   - `.gitignore`에 `.env`, `.env.local`, `.env*.local` 포함 여부 확인 — 없으면 추가부터 하고 진행
   - `git status`/`git diff --cached`로 스테이징된 파일에 `.env*`, API 키, 비밀번호, `DATABASE_URL` 같은 실제 시크릿 값이 하드코딩되어 있지 않은지 확인 (전부 `process.env.*`로 참조되는지)
   - 위 체크에서 시크릿이 발견되면 절대 커밋하지 말고 사용자에게 먼저 보고
   - push는 `main` 브랜치로 직접 (Vercel 자동배포 트리거되는 게 정상 동작이므로 별도 PR 프로세스 불필요)
4. 막히거나 아키텍처 결정이 필요하면 코드 작성을 멈추고 사용자에게 보고 (Claude와 재상의 필요).
5. 디자인은 `wireframe_main.html`을 그대로 컴포넌트로 쪼개는 것이 원칙 — 임의 변경 금지. 
   컴포넌트 작성 시 `tailwind.config.ts`에 정의된 커스텀 토큰(`ink`/`paper`/`brandRed`/
   `brandYellow`/`brandBlue`, `font-display`/`font-mono`/`font-sans`)을 반드시 사용할 것. 
   Tailwind 기본 클래스(`text-black`, `border-gray-*`, 시스템 기본 폰트 등)로 대체 금지 
   — 이걸로 실제 색상/폰트가 wireframe과 달라지는 사고가 STEP F에서 발생했음.
