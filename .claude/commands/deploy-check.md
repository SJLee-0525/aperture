---
description: 배포 전 점검. 빌드, Supabase RLS, 환경변수, 무료 한도와 시크릿 누출을 확인한다.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

Vercel 배포 직전 안전 점검 명령.

## 절차

### Step 1 — 빌드·린트

```bash
npm run build     # 실패 시 여기서 중단
npm run lint
```

- [ ] `package-lock.json` 이 변경됐다면 **npm 10 으로 재생성됐는가** (CI 는 Node 22/npm 10 `npm ci` — 로컬 npm 11 churn 시 전 잡 실패. `npx npm@10 install --package-lock-only` 후 `npx npm@10 ci --dry-run` 검증, [CLAUDE.md 개발 명령어](../../CLAUDE.md) 참조)
- [ ] `package.json` 변경 시 `package-lock.json` 도 같은 커밋에 staged 되어 있는가

### Step 2 — Supabase RLS 점검

- [ ] `npm run test:rules` 통과: 비로그인·일반 사용자 쓰기 제한, 관리자 CRUD·RPC·Storage 허용
- [ ] 새 테이블과 RPC의 권한 변경이 `supabase/migrations/`에 기록됨
- [ ] 공개 읽기는 `published = true` 행 또는 의도적으로 공개한 문서에만 허용됨
- [ ] 관리자 판별은 검증된 JWT의 `app_metadata.role = admin`을 사용함
- [ ] 애플리케이션 런타임에 secret key나 레거시 `service_role` 키가 없음

### Step 3 — 환경변수·시크릿

- [ ] `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 가 Vercel env 에도 등록됨
- [ ] **Vercel env 에 `NEXT_PUBLIC_FIREBASE_*`·`NEXT_PUBLIC_ADMIN_UID` 가 남아 있지 않음** — 코드 참조가 0건이라 동작에는 영향이 없지만, 남아 있으면 다음 사람이 살아 있는 설정으로 읽는다
- [ ] **`NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` 를 설정했다면 Web3Forms 대시보드에서 hCaptcha 가 필수로 켜져 있음** (🔴). 이 키는 설계상 번들에 노출되므로 허니팟과 캡차 토큰 검사는 `curl` 로 건너뛸 수 있다. 실제 경계는 대시보드 설정 하나뿐이고, 꺼져 있으면 메일함이 스팸에 열린다
- [ ] **Upstash/KV 자격증명이 프로덕션에 있음** — 없으면 챗이 비활성이고, 관리자 인증 실패 제한(`lib/auth/admin-auth-throttle.ts`)이 fail-open 이라 아무것도 세지 않는다
- [ ] 동의 철회 시 `_ga`·`_ga_*` 쿠키가 **실제 배포 도메인에서** 지워지는지 확인 — 쿠키 도메인이 어긋나면 삭제가 조용히 실패한다. 코드만으로는 판정할 수 없다
- [ ] rate limit 의 클라이언트 주소(`lib/rate-limit/client-address.ts`)가 배포 환경에서 위조 가능한지 확인 — Vercel 뒤가 아니면 `x-real-ip` 를 요청자가 직접 넣을 수 있어 IP 창이 무력화된다
- [ ] 번들에 들어가면 안 되는 값이 `NEXT_PUBLIC_` 접두사를 달고 있지 않음
- [ ] **진짜 시크릿(LLM/비전 API 키 등)이 코드·env 에 없음** (아키텍처 원칙 #8 — 이 프로젝트엔 애초에 없어야 함)
- [ ] **`SENTRY_AUTH_TOKEN` 이 코드·`NEXT_PUBLIC_*`·git 에 없음**. `.env.sentry-build-plugin`(로컬)과 Vercel Sensitive env에만 존재(ADR-0004)
- [ ] `NEXT_PUBLIC_SENTRY_DATA_REGION=US|DE`가 DSN의 실제 ingest 지역과 일치함. 누락 시 Sentry는 비활성
- [ ] Vercel의 **Automatically expose System Environment Variables**가 켜져 있어 Sentry가 Production과 Preview를 구분함
- [ ] **`NEXT_PUBLIC_USE_MOCK` 이 프로덕션(Vercel)에 `1` 로 설정돼 있지 않음** — 설정 시 실서비스가 mock 을 노출한다 (🔴). 미설정이 정상(prod=실데이터)
- [ ] `git status` 에 `.env*` 또는 자격증명 파일이 staged 되어 있지 않음

### Step 4 — 무료 한도 영향

- [ ] 새 공개 페이지(랜딩·음악·개발 포함)에 `revalidate`와 적절한 캐시 태그가 있음
- [ ] 공개 쿼리의 필터·정렬 열에 필요한 PostgreSQL 인덱스가 마이그레이션에 있음
- [ ] 업로드 경로(사진·음악 포스터·개발 썸네일)에 이미지 압축(webp ~2048px) 적용됨
- [ ] 지도가 `/photo/map` 라우트에서만 dynamic 로드되는가 (MapLibre 스크립트 code-split), 음악 YouTube 는 facade 후 클릭 시 iframe 인가
- [ ] Supabase DB·Storage·egress 사용량과 최근 백업 성공 시각을 확인함

### Step 5 — 결과 보고

```
## deploy-check 결과

빌드: ✅/❌
RLS: 🟢 안전 / 🔴 차단 사유
환경변수: ✅/❌ 누락 목록
무료 한도: 🟢/🟡 주의사항

### 배포 가능 여부: <가능 / 수정 후 재점검>
- [ ] ...
```

🔴 항목이 하나라도 있으면 배포 진행하지 말 것.

## 참조

- [`supabase` agent](../agents/supabase.md) — RLS·RPC·Storage 표준과 로컬 통합 테스트
- [`CLAUDE.md`](../../CLAUDE.md) — 무료 한도 가드 표
