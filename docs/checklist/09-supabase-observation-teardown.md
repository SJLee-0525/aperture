# Supabase 전환 관찰·Firebase 해체 절차

> 상위: [08-supabase-migration.md](08-supabase-migration.md) M8 · 계획 근거: [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md) §8~§10
> 실행 계획과 해체 전 기준값: [`docs/plan/11-firebase-teardown-and-supabase-backup.md`](../plan/11-firebase-teardown-and-supabase-backup.md)
> 관찰 기간: **2026-08-15(PR #18 머지) ~ 2026-08-29**. 기간 중 이상이 없으면 아래 해체 절차를 순서대로 진행한다.
> 관찰 기간에는 Firebase 프로젝트, Vercel 의 Firebase 환경변수, GCP 카드 등록을 건드리지 않는다. 셋이 롤백 경로다.

## 1. 관찰 기간 중 확인 (2~3일에 한 번, 5분)

- [x] keep-alive: GitHub Actions 의 `Supabase keep-alive` 가 3일 간격으로 성공하는지 확인한다. 실패가 이어지면 Supabase 장애 또는 secrets 문제이므로 로그를 확인하고 수동 dispatch 로 다시 실행한다
- [x] Supabase 대시보드: 일시정지 예고 배너가 없는지 확인한다(가장 중요). Usage 의 egress(캐시 5GB + 비캐시 5GB 각각), DB 용량(500MB), Storage(1GB) 추이가 완만한지 본다
- [x] 콘텐츠 저장 왕복: 관리자 저장 시 "RAG 자동 갱신 실패" 경고가 없고 공개 페이지에 revalidate 주기 안에 반영되는지 확인한다. 평소 편집이 곧 검증이라 별도 작업은 없다
- [x] 챗봇·검색: 가끔 챗 질문과 본문 검색이 정상 응답하는지 확인한다. Vercel 함수 로그의 `[chat-input]`(프롬프트 크기)과 `[chat-rag]`(청크 수) 값이 비정상적으로 크지 않은지 본다
- [x] Sentry·Vercel 로그: Supabase 호출 실패(4xx/5xx)가 반복되는 새 오류가 없는지 확인한다

### 관찰 종료 기준값 (2026-08-29 KST)

- [x] 프로젝트: Free, `ap-northeast-2`, Healthy, 일시정지 예고 없음
- [x] keep-alive: 2026-08-28 12:30 PM KST 마지막 성공. 최초 수동 1회와 이후 관찰 구간 6회 모두 성공
- [x] Usage: DB 0.032/0.5GB, Storage 0.076/1GB, Egress 0.25/5GB, Cached Egress 0.13/5GB, Auth MAU 2/50,000
- [x] 최근 24시간 API: 2xx 약 1,500건, 4xx 0건, 5xx 0건
- [x] 데이터: 콘텐츠 199행(발행 197·초안 2), RAG 424청크, 태그 10행, site 3행
- [x] Auth: 사용자 1명, `app_metadata.role = 'admin'` 1명
- [x] Storage: `media` 831개, 77,603,202 bytes
- [x] RAG 동기화: 원본 242/242, 100%, stale 0
- [x] anon 쓰기 재검증: `photos` insert HTTP 401, PostgREST `42501`, probe 행 0건
- [x] Firebase URL 전수 검사(2026-08-29): JSONB 8개 테이블의 `data::text`에서 `firebasestorage.googleapis.com`·`storage.googleapis.com` 검색, `total_firebase_url_matches = 0`

### 문제 발생 시 롤백

1. Vercel 대시보드에서 머지 이전 배포로 Instant Rollback 한다. Firebase 환경변수가 그대로라 이전 코드가 즉시 동작한다.
2. 주의: 전환 이후 Supabase 에만 저장된 편집분은 Firestore 에 없다. 롤백하면 그 편집이 공개 화면에서 사라지므로, 롤백 전에 전환 이후 편집한 문서 목록을 적어 두고 복구 후 다시 반영한다.
3. 원인을 수정하고 다시 배포해 복귀한다. 롤백이 3일을 넘겨도 keep-alive 가 계속 돌므로 Supabase 일시정지는 발생하지 않는다.

## 2. 관찰 종료 후 해체 (이상 없을 때, 순서대로)

### 2.1 코드 해체 (한 브랜치에서 진행, 게이트 전부 통과 후 머지)

- [x] 패키지 제거: `firebase`, `firebase-tools`, `@firebase/rules-unit-testing`. npm 10으로 lockfile 재생성·`ci --dry-run` 확인 — 2026-08-29
- [x] 설정 파일 삭제: `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, 기존 Rules 테스트 삭제 — 2026-08-29
- [x] `test:rules` 대체: 로컬 Supabase 스택 기반 RLS 통합 테스트 작성. 비로그인·일반 사용자·관리자 CRUD, 정렬 RPC, Storage 권한 포함. CI 2 suites·8 tests 통과, fixture 정리와 스택 종료 확인 — 2026-08-29
- [x] CSP 정리: Firebase Storage 호스트 제거, mock URL을 Supabase 형태로 교체 — 2026-08-29
- [x] 잔존 참조 정리: 이미지 설정, 본문 Firebase `/o/` 파서, fixture, `.env.example` 과 과도기 문구 정리 — 2026-08-29
- [ ] 검증: check·lint·knip·depcruise·test·build 통과. `rg -i firebase src` 결과가 0 또는 문서화된 예외만 남는다

### 2.2 문서 개정

- [x] `CLAUDE.md`: 스택 표(호스팅·인증·DB·이미지), 아키텍처 원칙(Rules 를 RLS 로), 데이터 모델(테이블 기준), 환경변수, 무료 한도 표, 개발 명령어(firebase CLI 제거)를 전면 개정한다 — 2026-08-20 완료. `test:rules`·firebase 에이전트는 해체 예정으로 표기만 남겼다
- [ ] `docs/adr/0001-serverless-rag.md` 에 Supabase 전환 각주를 달고, ADR-0005 에 해체 완료를 기록한다
- [x] `.claude/agents/firebase.md`를 `supabase.md`로 교체하고 hooks·deploy-check의 Firebase 전제 규칙을 제거 — 2026-08-29
- [x] troubleshooting 문서의 현재 용어를 정리하고 Firestore 읽기 최적화 문서는 역사 기록으로 표시. `firestore-rules-deploy-gotcha` 메모리는 저장소에 남아 있지 않음을 확인 — 2026-08-29

### 2.3 인프라·계정 정리 (코드 머지·배포 확인 후)

- [x] GitHub Actions 기반 주간 백업을 추가한다: DB roles/schema/data + `media` 버킷 + manifest·SHA-256을 age로 암호화해 Google Drive에 업로드 — 코드·셸 구문 검증 완료, 첫 원격 실행은 secrets 등록 후 확인
- [ ] 첫 자동 백업을 로컬에서 복호화하고 DB 행 수·RAG 청크·Storage 객체 수를 기준값과 대조한다
- [ ] Firebase 삭제 직전 `pre-firebase-teardown` 수동 백업을 만들고 Google Drive의 파일 존재·크기를 확인한다
- [ ] Vercel 에서 `NEXT_PUBLIC_FIREBASE_*` 6종을 제거하고 재배포 1회로 정상을 확인한다
- [ ] Firebase 콘솔: Auth 관리자 계정, Storage 데이터, 프로젝트 순서로 삭제한다. 프로젝트 삭제 뒤에는 Supabase 이전본이 유일본이 되고 되돌릴 수 없으므로 맨 마지막에 한다
- [ ] GCP: 예산 알림을 삭제하고 결제 계정 카드 등록을 해제한다 (카드 등록 표면 0 달성)
- [ ] Supabase CLI access token(30일짜리)을 폐기하고, `~/Desktop/github/aperture-migration/` 스크립트 보관 여부를 정한다 (키는 이미 폐기됨)

### 2.4 마감

- [ ] checklist 08 의 M8 을 ✅ 완료로 바꾸고 이 문서의 전 항목을 체크한다
- [ ] 릴리즈 태그(예: v1.4.x 또는 v1.5.0)에 해체 완료를 기록한다
