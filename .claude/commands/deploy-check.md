---
description: 배포 전 점검. 빌드 통과, Security Rules 안전성(전체 공개 금지 + 좋아요 예외 정확성), 환경변수(Firebase), 무료 한도 영향, 시크릿 누출을 확인한다. Vercel 배포·Rules 배포 직전에 실행.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

배포(Vercel push 또는 `firebase deploy`) 직전 안전 점검 명령.

## 절차

### Step 1 — 빌드·린트

```bash
npm run build     # 실패 시 여기서 중단
npm run lint
```

### Step 2 — Security Rules 점검 ★ (서버 없는 구조라 이게 보안의 전부)

- `firestore.rules` / `storage.rules` Read 후 확인:
  - [ ] `allow write: if true` 또는 match-all 허용 규칙 **없음** (있으면 🔴 즉시 중단)
  - [ ] `isAdmin()` 의 UID 가 실제 관리자 UID 와 일치 (firestore + storage 두 파일)
  - [ ] 새로 추가된 컬렉션이 Rules 에 누락되지 않음 (photos·albums·**musicWorks·musicSchedule·musicAwards·musicMedia·devProjects**·site)
  - [ ] **좋아요 예외가 정확함** — `photos` update 에서 익명 허용 조건이 아래 **셋 다** 있는가:
        `diff().affectedKeys().hasOnly(['likes'])` + `== resource.data.likes + 1` + `published == true`.
        하나라도 빠지면 🔴 (익명이 다른 필드 조작 / 임의값 세팅 / 초안 조작 가능해짐)
  - [ ] **좋아요 예외가 photos 에만 있는가** — 음악·개발 컬렉션에 무인증 write 예외가 새어들지 않았는가 (music*·dev* 는 read=published·write=admin 뿐)
  - [ ] `photos` 에서 익명 **create·delete·감소(-1)** 가 불가한가
- Rules 가 변경됐다면: Emulator 테스트 통과 확인 (`firebase` agent 체크리스트 — 특히 좋아요 +2/-1/타필드 거부, 음악·개발 무인증 write 거부)

### Step 3 — 환경변수·시크릿

- [ ] `.env.local` 의 `NEXT_PUBLIC_*` 키(Firebase 6개 + `ADMIN_UID`)가 Vercel env 에도 등록됨
- [ ] 번들에 들어가면 안 되는 값이 `NEXT_PUBLIC_` 접두사를 달고 있지 않음
- [ ] **진짜 시크릿(LLM/비전 API 키 등)이 코드·env 에 없음** (아키텍처 원칙 #8 — 이 프로젝트엔 애초에 없어야 함)
- [ ] `git status` 에 `.env*` / 서비스 계정 JSON 이 staged 되어 있지 않음

### Step 4 — 무료 한도 영향

- [ ] 새 공개 페이지(랜딩·음악·개발 포함)에 `revalidate` 있음 (Firestore 읽기 5만/일 보호)
- [ ] 공개 쿼리(`published + order`)마다 인덱스가 `firestore.indexes.json` 에 있는가 (컬렉션당 1개 · 총 7개)
- [ ] 업로드 경로(사진·음악 포스터·개발 썸네일)에 이미지 압축(webp ~2048px) 적용됨 (Storage 다운로드 1GB/일 보호)
- [ ] 좋아요 쓰기가 과도하지 않은가 (Firestore 쓰기 2만/일 — view 당 1회 수준)
- [ ] 지도가 `/photo/map` 라우트에서만 dynamic 로드되는가 (MapLibre 스크립트 code-split), 음악 YouTube 는 facade 후 클릭 시 iframe 인가
- [ ] (최초 배포 시) **GCP 예산 알림 $1 등록됨** (Firebase 결제 표면 — 지도는 CARTO 무료라 과금 없음)

### Step 5 — 결과 보고

```
## deploy-check 결과

빌드: ✅/❌
Rules: 🟢 안전 / 🔴 차단 사유 (좋아요 예외 포함)
환경변수: ✅/❌ 누락 목록
무료 한도: 🟢/🟡 주의사항

### 배포 가능 여부: <가능 / 수정 후 재점검>
- [ ] ...
```

🔴 항목이 하나라도 있으면 배포 진행하지 말 것.

## 참조

- [`firebase` agent](../agents/firebase.md) — Rules 표준 패턴·좋아요 예외·Emulator 테스트
- [`CLAUDE.md`](../../CLAUDE.md) — 무료 한도 가드 표
