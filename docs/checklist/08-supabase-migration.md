# Supabase 이전 구현 체크리스트

> 원본 계획: [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md) — 항목의 상세 근거는 계획 문서의 섹션 번호(§)를 따른다.
> 결정 근거: [ADR-0005](../adr/0005-supabase-migration.md) · 조사: [`docs/research/firebase-to-supabase.md`](../research/firebase-to-supabase.md)
> 사용법: 완료한 항목은 `- [x]`로 체크한다. 단계 순서(M0→M8)가 곧 의존 순서다. M7 전까지 프로덕션은 Firebase로 동작해야 한다.
> 마지막 갱신: 2026-08-15 (M0 완료 — 측정: Storage 68.42MB·객체 735·egress 월 환산 약 3GB. M1 진행 중, 적용 방식은 원격 `db push` 확정)

## 진행 요약

| 단계 | 내용                                   | 상태    |
| ---- | -------------------------------------- | ------- |
| M0   | 결정·측정·프로젝트 준비                | ✅ 완료 |
| M1   | 스키마·RLS·버킷·keep-alive             | 🔄 진행 중 |
| M2   | 데이터 마이그레이션 리허설             | ⬜ 미착수 |
| M3   | 인증 교체                              | ⬜ 미착수 |
| M4   | 공개 읽기 교체 (PostgREST + ISR 유지)  | ⬜ 미착수 |
| M5   | 관리자 쓰기·Storage 교체               | ⬜ 미착수 |
| M6   | RAG pgvector 전환                      | ⬜ 미착수 |
| M7   | 본 데이터 이전·전환 준비               | ⬜ 미착수 |
| M8   | 배포 전환·관찰·Firebase 해체           | ⬜ 미착수 |

상태: ⬜ 미착수 · 🔄 진행 중 · ✅ 완료

---

## 전 단계 공통 규칙

[`docs/checklist/07-dev-blog.md`](07-dev-blog.md)의 「전 단계 공통 구현 규칙」(저장소 컨벤션, JSDoc·주석)을 그대로 적용한다. 이 작업에 특화된 공통 규칙:

- [ ] 런타임 코드·env 파일에 service_role 키를 두지 않는다. service_role은 저장소 밖 1회성 마이그레이션에서만 쓴다 (§5)
- [ ] 공개 읽기는 supabase-js가 아니라 PostgREST 직접 `fetch` + `next:{revalidate,tags}`로만 한다. supabase-js는 브라우저(Auth·쓰기·Storage) 전용 (§1, §3)
- [ ] 각 단계 완료 시 `npm run build`·`npm run lint`·`npm run test`가 통과한다. mock 모드(`NEXT_PUBLIC_USE_MOCK=1`) 화면이 무손상이어야 한다
- [ ] Firebase 코드 삭제는 M8 해체 단계까지 미룬다. 그 전까지는 새 `lib/supabase/` 경계를 추가하고 import를 옮기는 방식으로 진행한다

## M0 — 결정·측정·프로젝트 준비 (§4 M0)

- [x] ADR-0005 Status를 Accepted로 확정하고 일시정지 트레이드오프 수용을 기록한다
- [x] Firebase 콘솔에서 최근 월 Storage 다운로드 트래픽을 확인해 egress 10GB/월과 비교 기록한다 (15일간 1.56GB, 월 환산 약 3GB — 한도 내)
- [x] Supabase 프로젝트를 ap-northeast-2 리전에 생성한다 (무료 활성 2개 슬롯 확인)
- [x] 관리자 계정 1개 생성 + `app_metadata.role = "admin"` 설정 (SQL로 `raw_app_meta_data` 병합), JWT signing keys(비대칭 ECC) 확인
- [x] `.claude/memory/decision_stack_firebase.md`에 재결정 사실을 추가한다

## M1 — 스키마·RLS·버킷·keep-alive (§2, §4 M1)

- [ ] `supabase/migrations/`에 테이블 10개 DDL 작성 (text PK, `sort_order`, `data` jsonb, timestamptz 기본값) (§2.1, §2.2)
- [ ] 예외 테이블 확인: `dev_articles`는 `sort_order` 없음(수동 정렬 없는 유일한 목록 테이블) + slug는 UNIQUE 제약 대신 `where slug <> ''` 부분 unique 인덱스 (빈 slug 초안 중복 허용 계약), `dev_article_tags`는 `id·ko·en` 세 컬럼만 (published·sort_order 없음) (§2.2)
- [ ] `updated_at` BEFORE UPDATE 트리거 작성
- [ ] 인덱스: 목록 테이블 `(published, sort_order)` 6개, `dev_articles (published, published_at desc, id asc)`, `rag_documents (source_type, source_id)` — 벡터 인덱스는 만들지 않는다
- [ ] `create extension vector` + `rag_documents.embedding vector(512)` (§2.2)
- [ ] 정렬 일괄 갱신 RPC 6개 작성 (수동 정렬 테이블별 템플릿 — `dev_articles` 제외, `security invoker` + `set search_path` + `revoke`/`grant execute`) — 부분 upsert는 `data jsonb not null` 검사로 실패하므로 금지 (§2.3)
- [ ] RLS: published 게이트 8개 테이블 + 전체 공개 2개 테이블, role 클레임 기반 admin write (§2.4)
- [ ] Storage 버킷 `media` 생성: 공개 read, `file_size_limit` 10MB, `allowed_mime_types image/*`, admin 클레임 write/delete 정책
- [ ] keep-alive 워크플로 `.github/workflows/supabase-keepalive.yml`: 주 2회 cron + `workflow_dispatch`, PostgREST를 anon key(repo secrets)로 직접 호출, 실패 알림 확인 — `schedule`은 main 머지 후에만 자동 실행되므로 그 전에는 수동 dispatch로 대신
- [ ] 원격 적용·검증: `supabase link` + `supabase db push`로 원격 프로젝트에 적용하고, PostgREST 호출로 RLS 동작(anon 게이트·admin 쓰기) 확인 (§4 M1 — 로컬 Docker 스택 없이 진행)

## M2 — 데이터 마이그레이션 리허설 (§5)

- [ ] 저장소 밖 임시 디렉토리에서 진행하고, Firebase 서비스 계정 키·service_role 키를 발급한다 (완료 후 폐기 항목까지 체크)
- [ ] 공식 도구 `firestore2json.js`로 9개 컬렉션 덤프 (`ragDocuments` 제외 — M7 재생성), 변환 훅(Timestamp→ISO, 스칼라 컬럼 추출, 나머지 `data` jsonb) 작성 (§5.1)
- [ ] 변환 예외 적용: `devArticleTags`는 `ko`·`en` 직접 컬럼 추출 (`data` 없음), `site`는 문서 id 3종(`config`·`music`·`dev`) 확인 (§5.1)
- [ ] 도구가 §2.2 스키마와 안 맞으면 자체 스크립트(전 문서 JSON 덤프 + `pg` insert)로 전환을 결정하고 기록한다
- [ ] `download.js`/`upload.js`로 4개 프리픽스(`photos`·`music`·`dev`·`dev-blog`) 파일 이전, 경로 보존 확인 (§5.2)
- [ ] URL 재작성 스크립트 작성·실행: 문서 필드 5종의 ImageMeta를 재귀 변환 (`url`·`preview.url`·`thumbnail.url` 전부 — 화면이 파생본 URL을 우선 사용) + 블로그 본문 Markdown (§5.3)
- [ ] 검증: 이전한 9개 컬렉션 문서 수 = 행 수, `data` 컬럼 보유 테이블에서 `firebasestorage` 잔존 0 (`dev_article_tags`·`rag_documents`는 `data`가 없어 제외), 표본 문서 필드 결손 없음 (§5.4)
- [ ] 스크립트 일체를 재실행 가능하게 보관한다 (M7 본 이전에 재사용)
- [ ] 마이그레이션에 쓴 두 키를 폐기했다

## M3 — 인증 교체 (§3, §4 M3)

- [ ] `@supabase/supabase-js` 추가 + lockfile을 npm 10으로 재생성 (`npx npm@10 install --package-lock-only` 후 `ci --dry-run`)
- [ ] `lib/supabase/client.ts`: 지연 싱글턴 함수 반환 규약 유지
- [ ] `lib/supabase/auth.ts`: `signInWithPassword`/`signOut`/`onAuthStateChange` + 한국어 에러 맵 재작성
- [ ] `use-auth.ts`: UID 비교를 role 클레임 판별로 교체, `NEXT_PUBLIC_ADMIN_UID` 참조 제거
- [ ] 서버 JWT 검증: JWKS 로컬 검증 + role 클레임 확인으로 `verify-admin-id-token.ts` 대체, 호출 4곳(revalidate action, embeddings 라우트 POST/GET, image-source, 미리보기 action) 연결
- [ ] `AuthGuard`·`LoginForm`·`test-admin-session` 우회 동작 확인 (인터페이스 무변경)
- [ ] Sentry 스크러버(`scrub-event.ts`)가 새 토큰 형태의 Authorization 헤더를 계속 지우는지 확인

## M4 — 공개 읽기 교체 (§3, §4 M4)

- [ ] `lib/supabase/public/transport.ts`: PostgREST fetch + `next:{revalidate,tags}` + `retry-fetch` 재사용
- [ ] 캐시 태그 접두사를 중립 이름으로 교체 (`constants/cache.ts` 생성기 2개)
- [ ] `public/*.ts` fetcher 이관: published 필터·`sort_order` 정렬을 PostgREST 쿼리로, Timestamp 디코더 4종·REST 봉투 디코딩 삭제
- [ ] `lib/content/` getter import 교체, mock 분기 무변경 확인
- [ ] `revalidate-public.ts`: M3 검증 함수로 교체, `updateTag`·`revalidatePath`·`CHAT_PROFILE_CACHE_TAG` 로직 무변경
- [ ] `admin-list-rest.ts`를 PostgREST `select=` projection으로 교체
- [ ] `transport`·디코더 테스트를 PostgREST fixture로 갱신, 오류 전파(빈 결과와 장애 구분) 계약 유지 확인
- [ ] 리허설 데이터가 있는 Supabase로 공개 3섹션 + 블로그 렌더 확인 (`NEXT_PUBLIC_USE_MOCK=0`)

## M5 — 관리자 쓰기·Storage 교체 (§3, §4 M5)

- [ ] `lib/admin/` repository들의 live 구현 내부를 supabase-js CRUD로 교체 (mock·화면·계약 무손상)
- [ ] 블로그 live 저장소 교체: `features/admin-dev-articles/_lib/live-dev-article-repository.ts`와 하위 `lib/firebase/dev-articles.ts` (CRUD·slug 중복 검사·태그 CRUD) — `lib/admin/` 밖에 있어 누락하기 쉽다. slug 사전 조회는 폼 오류 메시지용으로 유지 (§4 M5)
- [ ] `serverTimestamp()` 15곳 제거 (DB 기본값·트리거로 대체)
- [ ] `updateOrder` 계약을 배열 일괄로 변경: `admin-list-repository.ts` 타입, `use-ordered-admin.ts` 호출부, mock 구현, live는 정렬 전용 RPC 1회 호출 (§2.3 — 부분 upsert 금지)
- [ ] 사진 삭제의 앨범 참조 정리 로직 유지 확인 (조인 테이블 정규화는 범위 제외)
- [ ] `lib/supabase/storage.ts`: 업로드 18종·삭제·목록 시그니처 유지, 미사용 이미지 스캔을 `.list()` 메타데이터 기반으로 단순화
- [ ] `next.config.ts` remotePatterns·`storage-source-url.ts` 호스트 교체
- [ ] mock 모드 전 관리자 화면 회귀 확인 + 실데이터 모드 CRUD·드래그 정렬·이미지 업로드 수동 확인
- [ ] 드래그 정렬 1회가 네트워크 요청 1건인지 확인 (쓰기 증폭 해소의 완료 조건)

## M6 — RAG pgvector 전환 (§6)

- [ ] `match_rag_chunks` RPC 마이그레이션 추가 (후보 40, 섹션·모델 키 필터, `revoke`/`grant execute` 명시) (§6)
- [ ] `portfolio-embeddings` 라우트: Firestore commit 조립을 upsert + delete로 교체, 사용자 access token 전달로 RLS 인가, 배치 분할·1,000문서 가드 제거
- [ ] `rag-search.ts`: RPC 후보 + 후처리(키워드 0.35 가중, 하한 0.3/0.5, 우선 슬롯 3, 최종 8) 구조로 교체 — 기존 반환 계약 유지
- [ ] `prioritize` 대상이 후보 밖일 때의 보강 조회 구현 — 필터는 `(source_type, source_id)` 쌍 기준, `source_id` 단독 필터 금지 (§6)
- [ ] `rag-index.ts`·`public/rag.ts` 삭제, `CHAT_PROFILE_CACHE_TAG`는 프로필 캐시용으로 유지
- [ ] `/admin/maintenance` 전체 재생성으로 리허설 환경 인덱스 생성 후 챗봇 응답·참조 카드 확인
- [ ] 챗 p50 응답 시간을 이전 구조와 비교해 기록
- [ ] `use-rag-stale-alert`·fingerprint skip 정책이 새 저장소에서도 동작하는지 확인

## M7 — 본 데이터 이전·전환 준비 (§4 M7, §5)

- [ ] 콘텐츠 편집 동결 선언 (관리자 본인)
- [ ] M2 스크립트로 최종 데이터·파일 이전 + URL 재작성 재실행
- [ ] §5.4 검증 3종 재확인
- [ ] RAG 인덱스는 `/admin/maintenance` 전체 재생성으로 새로 생성
- [ ] Vercel 환경변수 교체 (§7 추가·제거 목록), `.env.example` 갱신
- [ ] 마이그레이션 키 폐기 재확인

## M8 — 배포 전환·관찰·Firebase 해체 (§4 M8, §8~§10)

- [ ] 배포 후 수동 시나리오: 공개 3섹션·앨범·지도, 관리자 CRUD·정렬·업로드, 챗봇, `?photo=`/`?work=`/`?project=`·블로그 slug 딥링크
- [ ] RLS 검증: anon 세션으로 비공개 문서 select·임의 insert가 거부되는지 실서버에서 확인
- [ ] keep-alive 첫 실행 성공 확인, Supabase 대시보드 egress·용량 모니터링 시작
- [ ] keep-alive 유효성 관찰: 주 2회로 충분하다고 가정하지 않고 관찰 기간 동안 대시보드에서 일시정지 예고가 없는지 확인, 필요하면 일 1회로 상향 (§4 M1)
- [ ] 2주 관찰: Firebase 프로젝트·이전 환경변수 보존, 전환 직후 1주는 편집 최소화 (롤백 = 이전 커밋 재배포 + env 복원, §9)
- [ ] 로컬 Supabase 기반 RLS 통합 테스트 작성으로 `test:rules` 대체 (§8)
- [ ] 관찰 종료 후 해체: firebase·firebase-tools·@firebase/rules-unit-testing 제거(lockfile npm 10 재생성), `firestore.rules`·`storage.rules`·`firestore.indexes.json`·`firebase.json`·`.firebaserc`·`lib/firebase/` 삭제, knip·depcruise 통과
- [ ] 문서 개정: CLAUDE.md(스택·원칙·데이터 모델·env·한도 표·명령어), ADR-0001 각주, `.claude/agents/firebase.md`, troubleshooting 2편 (§10)
- [ ] GCP 예산 알림·카드 등록 정리, Firebase 프로젝트 최종 삭제
