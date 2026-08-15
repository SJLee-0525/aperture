# Supabase 이전 구현 체크리스트

> 원본 계획: [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md) — 항목의 상세 근거는 계획 문서의 섹션 번호(§)를 따른다.
> 결정 근거: [ADR-0005](../adr/0005-supabase-migration.md) · 조사: [`docs/research/firebase-to-supabase.md`](../research/firebase-to-supabase.md)
> 사용법: 완료한 항목은 `- [x]`로 체크한다. 단계 순서(M0→M8)가 곧 의존 순서다. M7 전까지 프로덕션은 Firebase로 동작해야 한다.
> 마지막 갱신: 2026-08-15 (M0~M4 완료, M5 구현 완료 — 실데이터 수동 검증·원격 RPC 검증만 대기. 보류: keep-alive `schedule` 확인은 main 머지 후)

## 진행 요약

| 단계 | 내용                                   | 상태    |
| ---- | -------------------------------------- | ------- |
| M0   | 결정·측정·프로젝트 준비                | ✅ 완료 |
| M1   | 스키마·RLS·버킷·keep-alive             | ✅ 완료 |
| M2   | 데이터 마이그레이션 리허설             | ✅ 완료 |
| M3   | 인증 교체                              | ✅ 완료 |
| M4   | 공개 읽기 교체 (PostgREST + ISR 유지)  | ✅ 완료 |
| M5   | 관리자 쓰기·Storage 교체               | 🔄 구현 완료 (실데이터 검증 대기) |
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
- [x] 대체가 완료되고 소비처가 소멸한 Firebase 구현 파일은 단계별로 제거할 수 있다. Firebase 패키지·설정·Rules 와 잔여 계층(RAG REST 경로)의 일괄 해체는 M8 (M5 계획 검수에서 규칙 정정 — M4·M5 가 이미 이 방식으로 진행됨)

## M0 — 결정·측정·프로젝트 준비 (§4 M0)

- [x] ADR-0005 Status를 Accepted로 확정하고 일시정지 트레이드오프 수용을 기록한다
- [x] Firebase 콘솔에서 최근 월 Storage 다운로드 트래픽을 확인해 egress 10GB/월과 비교 기록한다 (15일간 1.56GB, 월 환산 약 3GB — 한도 내)
- [x] Supabase 프로젝트를 ap-northeast-2 리전에 생성한다 (무료 활성 2개 슬롯 확인)
- [x] 관리자 계정 1개 생성 + `app_metadata.role = "admin"` 설정 (SQL로 `raw_app_meta_data` 병합), JWT signing keys(비대칭 ECC) 확인
- [x] `.claude/memory/decision_stack_firebase.md`에 재결정 사실을 추가한다

## M1 — 스키마·RLS·버킷·keep-alive (§2, §4 M1)

- [x] `supabase/migrations/`에 테이블 10개 DDL 작성 (text PK, `sort_order`, `data` jsonb, timestamptz 기본값) (§2.1, §2.2)
- [x] 예외 테이블 확인: `dev_articles`는 `sort_order` 없음(수동 정렬 없는 유일한 목록 테이블) + slug는 UNIQUE 제약 대신 `where slug <> ''` 부분 unique 인덱스 (빈 slug 초안 중복 허용 계약), `dev_article_tags`는 `id·ko·en` 세 컬럼만 (published·sort_order 없음) (§2.2)
- [x] `updated_at` BEFORE UPDATE 트리거 작성
- [x] 인덱스: 목록 테이블 `(published, sort_order)` 6개, `dev_articles (published, published_at desc, id asc)`, `rag_documents (source_type, source_id)` — 벡터 인덱스는 만들지 않는다
- [x] `create extension vector` + `rag_documents.embedding vector(512)` (§2.2)
- [x] 정렬 일괄 갱신 RPC 6개 작성 (수동 정렬 테이블별 템플릿 — `dev_articles` 제외, `security invoker` + `set search_path` + `revoke`/`grant execute`) — 부분 upsert는 `data jsonb not null` 검사로 실패하므로 금지 (§2.3)
- [x] RLS: published 게이트 8개 테이블 + 전체 공개 2개 테이블, role 클레임 기반 admin write (§2.4)
- [x] Storage 버킷 `media` 생성: 공개 read, `file_size_limit` 10MB, `allowed_mime_types image/*`, admin 클레임 write/delete 정책 (공개 URL 응답으로 버킷 존재 확인)
- [x] keep-alive 워크플로 `.github/workflows/supabase-keepalive.yml`: 주 2회 cron + `workflow_dispatch`, PostgREST를 anon key(repo secrets)로 직접 호출 — 핑 경로(`site_documents` select)는 curl로 검증 완료. `schedule`은 main 머지 후에만 자동 실행되므로 그 전에는 수동 dispatch로 대신
- [x] 원격 적용: `supabase link` + `supabase db push`로 마이그레이션 4개 적용 완료 (§4 M1 — 로컬 Docker 스택 없이 진행)
- [x] anon 검증: 읽기 200(`photos`·`site_documents`·`rag_documents` 빈 배열), 쓰기 42501 거부, 정렬 RPC 실행 거부
- [x] admin 검증: 관리자 JWT `app_metadata.role=admin`(ES256) 확인, insert 201 → 미발행 anon 비노출 → 정렬 RPC 204(`sort_order` 반영 + `updated_at` 트리거 동작) → 발행 후 anon 노출 → delete 204 왕복 통과

## M2 — 데이터 마이그레이션 리허설 (§5)

- [x] 저장소 밖 임시 디렉토리(`~/Desktop/github/aperture-migration/`)에서 진행, Firebase 서비스 계정 키·Supabase secret key 발급
- [x] 자체 스크립트로 전환 결정: 공식 도구는 스칼라+jsonb 하이브리드 스키마·태그 예외·URL 재작성을 어차피 훅으로 다 짜야 해서 채택하지 않음. `dump/transform/upload-storage/insert/verify` 5개 스크립트(firebase-admin + supabase-js, 전부 upsert라 M7 델타 재실행 안전)
- [x] 9개 컬렉션 덤프 (`ragDocuments` 제외 — M7 재생성): 문서 204개 (photos 173·albums 1·musicWorks 4·musicAwards 0·musicMedia 4·devProjects 9·devArticles 3·devArticleTags 7·site 3)
- [x] 변환: Timestamp→ISO, 스칼라 추출(`published`·`order`→`sort_order`·`slug`·`publishedAt`), 원본 `createdAt`/`updatedAt` 보존, 예외 적용(`devArticleTags` 직접 컬럼, `site` id 3종 확인)
- [x] Storage 이전: 759개 객체를 `media` 버킷에 경로 보존 업로드, 공개 URL 실서빙 확인(HTTP 200, image/webp)
- [x] URL 재작성: ImageMeta 재귀 변환(`url`·`preview.url`·`thumbnail.url`) + 블로그 본문 Markdown 치환(rag 글 이미지 4건 확인) (§5.3)
- [x] 검증: 9개 컬렉션 문서 수 = 행 수 전부 일치, `data` 보유 8테이블 `firebasestorage` 잔존 0건, 표본(사진·글·site 3문서) 필드 결손 없음 (§5.4)
- [x] 스크립트 일체를 `~/Desktop/github/aperture-migration/`에 재실행 가능하게 보관 (M7 본 이전에 재사용)
- [x] 마이그레이션에 쓴 두 키를 폐기했다 (Firebase 서비스 계정 키 삭제 + Supabase secret key 회전 완료 — M7 때 재발급)

## M3 — 인증 교체 (§3, §4 M3)

- [x] `@supabase/supabase-js` 추가 + lockfile을 npm 10으로 재생성 (`npx npm@10 install --package-lock-only` 후 `ci --dry-run`)
- [x] `lib/supabase/client.ts`: 지연 싱글턴 함수 반환 규약 유지 (계약 테스트 포함). 서버 검증용 클라이언트는 `persistSession:false` 로 분리
- [x] `lib/supabase/auth.ts`: `signInWithPassword`/`signOut`/`onAuthStateChange` + 한국어 에러 맵 재작성, 토큰 획득 7곳을 `getAdminAccessToken` 하나로 수렴
- [x] `use-auth.ts`: UID 비교를 role 클레임 판별로 교체, `NEXT_PUBLIC_ADMIN_UID` 참조 제거, role 판별 단위 테스트 신설
- [x] 서버 JWT 검증: `getClaims`(JWKS 로컬 검증) + role 클레임 확인으로 `verify-admin-id-token.ts` 내부 교체 — 시그니처 유지로 호출 5곳(revalidate action, embeddings POST/GET, image-source, 미리보기 action) 무수정
- [x] `AuthGuard`·`LoginForm`·`test-admin-session` 우회 동작 확인 (인터페이스 무변경, 테스트 세션 `isAdmin=false` 안전장치 유지)
- [x] Sentry 스크러버(`scrub-event.ts`)는 헤더 키 기준이라 동작 무변경 — 주석·fixture 문구만 갱신
- [x] 실브라우저 로그인 검증: `/admin/login` 로그인 → 새로고침 세션 지속 확인 (최초 시도에서 CSP connect-src 누락으로 차단 → Supabase 호스트를 connect-src·img-src·STORAGE_IMAGE_HOSTS 에 추가해 해결)
- [x] 과도기 기록: live 관리자 CRUD·Storage·RAG sync 는 M5/M6 전환 전까지 브랜치에서 의도적 비정상 (프로덕션 main 무영향, mock 관리자·공개 경로 정상)

## M4 — 공개 읽기 교체 (§3, §4 M4)

- [x] `lib/supabase/public/transport.ts`: PostgREST fetch + `next:{revalidate,tags}` + `retry-fetch` 재사용. 테이블별 서술자(`SUPABASE_COLLECTIONS`)가 projection·정렬·published 유무의 단일 출처, 행 병합은 data 먼저 + 스칼라 덮기
- [x] 캐시 태그 접두사를 `db:` 논리 이름으로 교체 (`constants/cache.ts` 생성기 2개 + 호출처 rename) — 구 `firestore:*` 태그 캐시는 revalidate 3600s 내 자연 만료로 수용
- [x] `public/*.ts` fetcher 이관: published 필터·`sort_order` 정렬을 PostgREST 쿼리로, Timestamp 디코더·REST 봉투 디코딩 삭제. 대체된 Firestore 공개 fetcher 5개 제거 (`transport`·`rag`·`retry-fetch` 는 M6까지 유지)
- [x] `lib/content/` getter import 교체, mock 분기 무변경. `rag-source` 의 관리자 단건 조회는 사용자 토큰 + RLS 인가(`fetchRowAsUser`)로 재작성
- [x] `revalidate-public.ts`: M3 검증 함수 그대로 사용 (시그니처 유지로 무수정), `updateTag`·`revalidatePath`·`CHAT_PROFILE_CACHE_TAG` 로직 무변경
- [x] `transport`·디코더 테스트를 PostgREST fixture로 신설·갱신 (apikey 전용 헤더, fresh no-store, 논리 태그, 빈 배열→null, 4xx throw, 특수문자 ID, 태그 무필터, dev_articles 무 sort_order, 스칼라 우선)
- [x] 리허설 데이터가 있는 Supabase로 공개 3섹션 + 앨범 + 블로그 목록/상세 렌더 확인 (`NEXT_PUBLIC_USE_MOCK=0` — supabase 이미지 URL 544건, firebasestorage 0건, 서버 로그 firestore 호출 0건. 챗봇은 기존 Firebase RAG 검색 경로 유지)

## M5 — 관리자 쓰기·Storage 교체 (§3, §4 M5)

- [x] `admin-list-rest.ts`를 supabase-js `select` projection(`lib/supabase/admin-list.ts`)으로 교체 — jsonb 별칭은 객체·배열 `->`, 텍스트 `->>` 로 응답 타입을 고정. 공통 `requireAdminSession()` 가드가 RLS 의 조용한 초안 누락을 로그인 오류로 변환
- [x] `lib/admin/` repository들의 live 구현 내부를 supabase-js CRUD로 교체 (mock·화면·계약 무손상 — E2E admin 20케이스 통과). 행 인코딩은 `admin/row-codec` 단일 출처(스칼라를 data 에서 제거, DB 소유 타임스탬프 미기록, 왕복 테스트 포함)
- [x] 블로그 live 저장소 교체: `live-dev-article-repository.ts`는 import 만 교체(로직 무변경), CRUD·slug 중복 검사·태그 CRUD 는 `lib/supabase/dev-articles.ts` 로 이식. 태그 생성은 사전 조회 대신 PK 충돌(23505)을 한국어 메시지로 변환
- [x] `serverTimestamp()` 18곳 제거 (계획의 15곳은 실측 정정 — DB 기본값·트리거로 대체. `undefined` 필드를 거부하던 Firestore 특성도 JSON 직렬화로 함께 해소)
- [x] `updateOrder` 계약을 배열 일괄로 변경: `admin-list-repository.ts` 타입, `use-ordered-admin.ts` 호출부(신규 훅 테스트 포함), mock 구현, live는 행 수를 반환하는 정렬 RPC 1회(반환 수 불일치 = 실패, 빈 목록 = 미호출, 중복 ID 사전 거부)
- [x] 사진 삭제의 앨범 참조 정리 로직 유지 (순차 처리 — 앨범 정리 실패 시 사진 미삭제, 단계별 실패 의미 주석 고정. 조인 테이블 정규화는 범위 제외)
- [x] `lib/supabase/storage.ts`: 업로드 12종·삭제 5종·목록 시그니처 유지, `.list()` 1,000개 페이지네이션 + 폴더 재귀, `.remove()` 1,000개 청크, 미사용 이미지 스캔은 응답 메타데이터 기반(객체별 getMetadata N+1 소멸)
- [x] 본문 이미지 경로 파서(`article-body-storage-paths`)를 Supabase 공개 URL(URL 파싱)과 기존 Firebase 형식 이중 지원으로 교체 — 누락 시 본문 이미지 전체가 미사용 삭제 후보가 되는 M5 최대 위험 해소 (테스트 8케이스 추가)
- [x] `next.config.ts` remotePatterns 에 Supabase 호스트 추가, `storage-source-url` 을 Supabase origin 정확 일치 + 공개 media 경로 한정으로 재작성(서명·변환 엔드포인트 거부, redirect 재검증 보존)
- [x] mock 모드 전 관리자 화면 회귀 확인 (`test:e2e:admin` 20 통과) — 실데이터 모드 CRUD·드래그 정렬·이미지 업로드 수동 확인은 사용자 검증 대기
- [ ] 실데이터 검증(사용자): 관리자 목록(초안 포함)·항목 생성→편집→발행→삭제 왕복·이미지 업로드·site 설정 병합 저장·태그 중복 거부, **드래그 정렬 1회 = 네트워크 요청 1건**(devtools — 쓰기 증폭 해소의 완료 조건), 삭제 후 Storage 폴더 소멸
- [ ] 원격 RPC 실검증(admin JWT): 2건→반환 2 / 부재 ID 포함→부분 반환 검출 / 동일 값 재저장→대상 행 수 / `updated_at` 트리거 (anon 거부는 확인 완료)
- [x] 알려진 부채 기록: 사진·음악·프로젝트 폴더의 Storage 잔존 파일은 orphan 스캔 대상(dev-blog 한정)이 아니다. M5 후에도 RAG 동기화는 M6까지 실패(라우트가 Firestore 에 쓰기 때문 — stale 배너 지속)

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
