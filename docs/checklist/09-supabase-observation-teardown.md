# Supabase 전환 관찰·Firebase 해체 절차

> 상위: [08-supabase-migration.md](08-supabase-migration.md) M8 · 계획 근거: [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md) §8~§10
> 관찰 기간: **2026-08-15(PR #18 머지) ~ 2026-08-29**. 기간 중 이상이 없으면 아래 해체 절차를 순서대로 진행한다.
> 관찰 기간에는 Firebase 프로젝트, Vercel 의 Firebase 환경변수, GCP 카드 등록을 건드리지 않는다. 셋이 롤백 경로다.

## 1. 관찰 기간 중 확인 (2~3일에 한 번, 5분)

- [ ] keep-alive: GitHub Actions 의 `Supabase keep-alive` 가 3일 간격으로 성공하는지 확인한다. 실패가 이어지면 Supabase 장애 또는 secrets 문제이므로 로그를 확인하고 수동 dispatch 로 다시 실행한다
- [ ] Supabase 대시보드: 일시정지 예고 배너가 없는지 확인한다(가장 중요). Usage 의 egress(월 5GB), DB 용량(500MB), Storage(1GB) 추이가 완만한지 본다
- [ ] 콘텐츠 저장 왕복: 관리자 저장 시 "RAG 자동 갱신 실패" 경고가 없고 공개 페이지에 revalidate 주기 안에 반영되는지 확인한다. 평소 편집이 곧 검증이라 별도 작업은 없다
- [ ] 챗봇·검색: 가끔 챗 질문과 본문 검색이 정상 응답하는지 확인한다. Vercel 함수 로그의 `[chat-input]`(프롬프트 크기)과 `[chat-rag]`(청크 수) 값이 비정상적으로 크지 않은지 본다
- [ ] Sentry·Vercel 로그: Supabase 호출 실패(4xx/5xx)가 반복되는 새 오류가 없는지 확인한다

### 문제 발생 시 롤백

1. Vercel 대시보드에서 머지 이전 배포로 Instant Rollback 한다. Firebase 환경변수가 그대로라 이전 코드가 즉시 동작한다.
2. 주의: 전환 이후 Supabase 에만 저장된 편집분은 Firestore 에 없다. 롤백하면 그 편집이 공개 화면에서 사라지므로, 롤백 전에 전환 이후 편집한 문서 목록을 적어 두고 복구 후 다시 반영한다.
3. 원인을 수정하고 다시 배포해 복귀한다. 롤백이 3일을 넘겨도 keep-alive 가 계속 돌므로 Supabase 일시정지는 발생하지 않는다.

## 2. 관찰 종료 후 해체 (이상 없을 때, 순서대로)

### 2.1 코드 해체 (한 브랜치에서 진행, 게이트 전부 통과 후 머지)

- [ ] 패키지 제거: `firebase`, `firebase-tools`, `@firebase/rules-unit-testing`. lockfile 은 npm 10 재생성 절차를 지킨다 (`git checkout -- package-lock.json && npx npm@10 install --package-lock-only && npx npm@10 ci --dry-run`)
- [ ] 설정 파일 삭제: `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`. `test:rules` 스크립트도 제거한다
- [ ] `test:rules` 대체: 로컬 Supabase 스택(`supabase start`) 기반 RLS 통합 테스트를 작성한다 (§8: anon 비공개 select 거부, admin 클레임 쓰기 허용, 정렬 RPC 권한)
- [ ] CSP 정리: `security-headers.ts` 의 `FIREBASE_HOSTS` 를 제거하고 `STORAGE_IMAGE_HOSTS` 에서 Firebase 2종을 뺀다. mock 업로더가 Firebase URL 형태를 쓰면 Supabase 형태로 먼저 교체한다
- [ ] 잔존 참조 정리: `next.config.ts` 의 firebasestorage remotePattern, `article-body-storage-paths` 의 Firebase `/o/` 파서(데이터 URL 은 전부 재작성됨), `mocks/` 의 firebasestorage URL 픽스처, `.env.example` 의 Firebase 블록과 과도기 문구
- [ ] 검증: check·lint·knip·depcruise·test·build 통과. `rg -i firebase src` 결과가 0 또는 문서화된 예외만 남는다

### 2.2 문서 개정

- [ ] `CLAUDE.md`: 스택 표(호스팅·인증·DB·이미지), 아키텍처 원칙(Rules 를 RLS 로), 데이터 모델(테이블 기준), 환경변수, 무료 한도 표, 개발 명령어(firebase CLI 제거)를 전면 개정한다
- [ ] `docs/adr/0001-serverless-rag.md` 에 Supabase 전환 각주를 달고, ADR-0005 에 해체 완료를 기록한다
- [ ] `.claude/agents/firebase.md` 를 supabase 에이전트로 개편하거나 삭제하고, `.claude/hooks` 의 Firebase 전제 규칙을 점검한다
- [ ] troubleshooting 문서 2편과 `docs/agents/*` 의 Firebase 서술을 정리하고, `firestore-rules-deploy-gotcha` 메모리를 폐기한다

### 2.3 인프라·계정 정리 (코드 머지·배포 확인 후)

- [ ] Vercel 에서 `NEXT_PUBLIC_FIREBASE_*` 6종을 제거하고 재배포 1회로 정상을 확인한다
- [ ] Firebase 콘솔: Auth 관리자 계정, Storage 데이터, 프로젝트 순서로 삭제한다. 프로젝트 삭제 뒤에는 Supabase 이전본이 유일본이 되고 되돌릴 수 없으므로 맨 마지막에 한다
- [ ] GCP: 예산 알림을 삭제하고 결제 계정 카드 등록을 해제한다 (카드 등록 표면 0 달성)
- [ ] Supabase CLI access token(30일짜리)을 폐기하고, `~/Desktop/github/aperture-migration/` 스크립트 보관 여부를 정한다 (키는 이미 폐기됨)

### 2.4 마감

- [ ] checklist 08 의 M8 을 ✅ 완료로 바꾸고 이 문서의 전 항목을 체크한다
- [ ] 릴리즈 태그(예: v1.4.x 또는 v1.5.0)에 해체 완료를 기록한다
