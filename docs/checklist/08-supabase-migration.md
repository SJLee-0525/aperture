# Supabase 이전 구현 체크리스트

> 원본 계획: [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md) — 항목의 상세 근거는 계획 문서의 섹션 번호(§)를 따른다.
> 결정 근거: [ADR-0005](../adr/0005-supabase-migration.md) · 조사: [`docs/research/firebase-to-supabase.md`](../research/firebase-to-supabase.md)
> 사용법: 완료한 항목은 `- [x]`로 체크한다. 단계 순서(M0→M8)가 곧 의존 순서다. M7 전까지 프로덕션은 Firebase로 동작해야 한다.
> 마지막 갱신: 2026-08-16 (M0~M7 완료, M8 진행 중 — PR #18 머지로 프로덕션 Supabase 전환, 배포 후 수동 시나리오·RLS·keep-alive 확인 완료. 잔여: 2주 관찰(~08-29) 후 해체. 관찰·해체 절차: [09-supabase-observation-teardown.md](09-supabase-observation-teardown.md))
> 해체 실행 계획과 2026-08-29 기준값: [11-firebase-teardown-and-supabase-backup.md](../plan/11-firebase-teardown-and-supabase-backup.md)

## 진행 요약

| 단계 | 내용                                  | 상태                         |
| ---- | ------------------------------------- | ---------------------------- |
| M0   | 결정·측정·프로젝트 준비               | ✅ 완료                      |
| M1   | 스키마·RLS·버킷·keep-alive            | ✅ 완료                      |
| M2   | 데이터 마이그레이션 리허설            | ✅ 완료                      |
| M3   | 인증 교체                             | ✅ 완료                      |
| M4   | 공개 읽기 교체 (PostgREST + ISR 유지) | ✅ 완료                      |
| M5   | 관리자 쓰기·Storage 교체              | ✅ 완료                      |
| M6   | RAG pgvector 전환                     | ✅ 완료                      |
| M7   | 본 데이터 이전·전환 준비              | ✅ 완료                      |
| M8   | 배포 전환·관찰·Firebase 해체          | 🔄 진행 중 (2주 관찰 ~08-29) |

상태: ⬜ 미착수 · 🔄 진행 중 · ✅ 완료

---

## 전 단계 공통 규칙

[`docs/checklist/07-dev-blog.md`](07-dev-blog.md)의 「전 단계 공통 구현 규칙」(저장소 컨벤션, JSDoc·주석)을 그대로 적용한다. 이 작업에 특화된 공통 규칙:

- [x] 런타임 코드·env 파일에 service_role 키를 두지 않는다. service_role은 저장소 밖 1회성 마이그레이션에서만 쓴다 (§5) — 전 단계 준수, 키는 M2 종료 시 폐기
- [x] 공개 읽기는 supabase-js가 아니라 PostgREST 직접 `fetch` + `next:{revalidate,tags}`로만 한다. supabase-js는 브라우저(Auth·쓰기·Storage) 전용 (§1, §3) — depcruise·구현 전반에서 유지
- [x] 각 단계 완료 시 `npm run build`·`npm run lint`·`npm run test`가 통과한다. mock 모드(`NEXT_PUBLIC_USE_MOCK=1`) 화면이 무손상이어야 한다 — M0~M8 전 단계 게이트 통과, PR #18 CI 통과
- [x] 대체가 완료되고 소비처가 소멸한 Firebase 구현 파일은 단계별로 제거한다(M4~M6 이 이 방식으로 진행 — M6 에서 `lib/firebase/` 소멸). Firebase 패키지·Rules·프로젝트 설정·환경변수의 최종 해체는 M8

## M0 — 결정·측정·프로젝트 준비 (§4 M0)

- [x] ADR-0005 Status를 Accepted로 확정하고 일시정지 트레이드오프 수용을 기록한다
- [x] Firebase 콘솔에서 최근 월 Storage 다운로드 트래픽을 확인해 egress 10GB/월(캐시 5GB + 비캐시 5GB 각각)과 비교 기록한다 (15일간 1.56GB, 월 환산 약 3GB — 한도 내)
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
- [x] 실데이터 검증(사용자 수행, M6 계획 승인 전 완주): 사진·앨범·연주(음악)·개발 프로젝트·블로그(수정·삭제 포함)·랜딩/사이트 설정·문의(연락) 전 영역의 CRUD·드래그 정렬·이미지 업로드 이상 없음. 유일한 발견 = 장소 검색 네트워크 오류 → Supabase 무관(CSP 강제 모드 회귀), M6 사전 픽스로 Nominatim 호스트를 connect-src 에 추가해 해소
- [x] 원격 RPC 실검증(admin JWT): 2건→반환 2, 부재 ID 포함 3건→반환 2(부분 반영 검출), 동일 값 재저장→대상 행 수, `updated_at` 트리거 발동, `merge_site_document` 반환 1 + 기존 필드 7종 보존 병합 (anon 거부 포함, 테스트 행·probe 정리 완료)
- [x] 알려진 부채 기록: 사진·음악·프로젝트 폴더의 Storage 잔존 파일은 orphan 스캔 대상(dev-blog 한정)이 아니다. M5 후에도 RAG 동기화는 M6까지 실패(라우트가 Firestore 에 쓰기 때문 — stale 배너 지속)

## M6 — RAG pgvector 전환 (§6)

- [x] 사전 픽스: 장소 검색(Nominatim) 호스트를 CSP connect-src 에 추가 + 회귀 테스트 — CSP 강제 모드 이후 차단이 네트워크 오류로 위장되던 회귀(Supabase 무관)
- [x] `match_rag_chunks` RPC 마이그레이션 적용 (후보 40 기본·1~100 clamp, 섹션 허용 4값 intersect, 모델 키 필터, published 명시, revoke 후 anon+authenticated grant). vector 확장이 `extensions` 스키마라 `set search_path = pg_catalog, extensions` + 테이블 완전 수식 — `''` 로는 `<=>` 해석 불가
- [x] 우선 보강: `(prioritize_source_type, prioritize_source_id)` 쌍이 모두 있을 때만 그 원본의 발행 청크 전량을 후보에 union, `distinct on (id)` 중복 제거. 벡터 순위로 자르지 않는다 — 앱의 우선 슬롯 선별이 키워드 점수 합산 후라서
- [x] `lib/supabase/rag.ts` 신설(서버 전용 `server-only`): RPC 검색(anon), 메타 조회(`order=id.asc` Range 페이지네이션·416 종료), 교체(upsert 100행 청크 → stale 삭제 50개 청크 `in.(...)` 이중따옴표 quoting). `replacementScopeFor()` 가 범위 단일 출처(photoTags = 사진 전체, sourceId 필터 금지). 저장 전 벡터 개수·512차원·유한값 전수 검증으로 부분 갱신 차단, 1,000문서 가드 유지
- [x] `portfolio-embeddings` 라우트: Firestore commit 조립을 rag.ts 호출로 교체 — POST/GET 응답 스키마·502 불변, 업스트림 원문은 서버 로그만. GET 은 id 단순 비교(구 full resource name 비교 대체)
- [x] `rag-search.ts`: RPC 후보 + 후처리(키워드 0.35 가중, 하한 0.3/0.5, 우선 슬롯 3, 최종 8) 구조로 교체 — 기존 반환 계약 유지, 모델·섹션 필터는 RPC 소관
- [x] 알려진 검색 품질 변화: 키워드 구제가 벡터 상위 40 후보 안에서만 작동 — 벡터 41위 밖의 keyword-only 일치는 결과에서 빠질 수 있다(구조상 변화, 코드 주석·테스트에 명시). 실데이터 고유명사 질의 recall 확인은 아래 검증 항목
- [x] `rag-index.ts`(+test)·`lib/firebase/public/*` 5파일 삭제, `CHAT_PROFILE_CACHE_TAG`·route 무효화는 프로필 캐시용으로 유지. 도메인 유틸 4종(+테스트)을 `lib/content/` 로 이동해 `lib/firebase/` 완전 소멸 — Firebase 활성 import·env 참조 0 (3분할 grep, 잔존 호스트 문자열은 CSP M8 유지분·구 URL 파서 픽스처·mock 뿐)
- [x] 테스트 재작성: route 12케이스(upsert 선행·스코프 일치·quoting·Range·벡터 검증 시 쓰기 0회·502 원문 비노출), `rag.test.ts` 신설(scope 5매핑·직렬화·페이지네이션·순서·상한), rag-search 10케이스. 전체 1,599 통과 + check·lint·knip·depcruise·build 통과
- [x] 원격 RPC anon 스모크: 512차원 → 200 `[]`(빈 테이블), 함수·연산자 해석 정상. 함수 인자 typmod 는 미강제라 차원 불일치는 행 존재 시 `<=>` 평가에서 오류 — fixture 검증에서 확인
- [x] 실제 행 fixture 원격 RPC 검증 11/11 통과: 정상 포함·타 모델/타 섹션/미발행(anon) 제외·코사인 순위·후보 밖 우선 대상 보강·중복 없음·clamp 하한(0→1행)/상한·511차원 오류(행 존재 시 `<=>` 평가에서 발생)·허용 밖 섹션 빈 결과, fixture 행 정리 완료
- [x] 실데이터 전체 재생성 성공: 316청크/4.8초(profile 1·development 127·music 13·photography 175), `rag_documents` 행 수 316 = count, GET percent 100·stale 0. 챗 실검증 — 프로젝트·수상(SSAFY 우수상)·울릉도 사진 질의 모두 참조 카드(Supabase 썸네일 URL 포함)와 함께 정답, 고유명사 recall 정상
- [x] 챗 p50 M6 baseline 기록(2026-08-15, 로컬 dev + 원격 Supabase): `match_rag_chunks` RPC 구간 warm-up 3회 제외 20회 median 78ms·mean 93ms·max 191ms. 전체 챗 응답(고정 질의, warm-up 3회 제외 15회) median 3.92s·max 4.49s — LLM 생성이 지배적이라 RPC 왕복(질문당 1회)은 총 지연의 2% 수준. 요청 간 캐시 소멸(구 스냅샷 대비)은 수용
- [x] 사용자 최종 확인(2026-08-15): 사진 저장 시 "RAG 자동 갱신 실패" 경고 소멸(증분 sync 정상 — 저장 후 317/317·갱신 필요 0), maintenance 패널 수치 표시 정상(이미지 파생본 243/243·orphan 0), 장소 검색 dev 서버 재시작 후 복구

## M7 — 본 데이터 이전·전환 준비 (§4 M7, §5)

- [x] 델타 재실행 생략 결정(2026-08-15, 사용자 확인): M2 덤프 이후 프로덕션(Firebase) 관리자 편집이 없었다. M5·M6 실데이터 검증 편집은 전부 Supabase 로 갔으므로 Firestore→Supabase upsert 재실행은 오히려 최신 수정을 옛 데이터로 덮어쓴다 — 계획의 재실행 전제(프로덕션이 계속 Firebase 로 편집됨)가 소멸해 생략이 안전한 유일한 경로
- [x] 콘텐츠 편집 규칙 선언: M8 배포 전환까지 프로덕션(Firebase) 관리자에서 편집 금지 — Firestore 에 쓰여 유실된다. 편집은 이 브랜치의 실데이터 dev 서버(Supabase)로만
- [x] §5.4 검증 재확인(델타 생략 판 — 초안 포함 전체 행 수): photos 174(+1, M5·M6 검증 저장분)·albums 1·music_works 4·music_awards 0·music_media 4·dev_projects 9·dev_articles 3·dev_article_tags 7·site_documents 3 — M2 기록 204문서 대비 검증 편집분 외 전 컬렉션 일치, 유실 없음
- [x] RAG 인덱스 재생성 — M6 검증에서 완료(317청크, percent 100·stale 0). 모델·데이터 변경이 없으므로 재실행 불필요
- [x] `.env.example` 갱신: 콘텐츠 소스·테스트 세션·보안 경계 문구를 Supabase(RLS) 기준으로 정정 (Firebase 블록 자체 제거는 M8)
- [x] Vercel 환경변수 추가 완료(사용자, 2026-08-15): `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 전 환경. Firebase 변수 제거는 M8 배포 전환 후 — main 이 아직 Firebase 코드라 지금 지우면 프로덕션이 죽는다. 콘텐츠 편집 동결도 사용자가 선언(M8 전환 완료까지 게시글 업데이트 중단)
- [x] 마이그레이션 키 폐기 재확인: M2 종료 시 Firebase 서비스 계정 키 삭제 + Supabase secret key 회전 완료, 델타 생략으로 재발급 자체가 없었음. Supabase CLI access token(30일)은 M8 해체 작업까지 유지 후 폐기

## M8 — 배포 전환·관찰·Firebase 해체 (§4 M8, §8~§10)

- [x] 배포 후 수동 시나리오(2026-08-15, sungjoon.works): 공개 경로 9종 200·Supabase 이미지 URL 522건(Firebase 0)·CSP 에 Supabase·Nominatim 확인, 블로그 slug 상세 렌더, 본문 검색 API 매치, 챗봇 RAG 참조 카드 정답. 관리자 CMS 전 영역 CRUD 는 사용자가 프로덕션에서 검증 완료 — 콘텐츠 편집 동결 해제
- [x] RLS 검증(2026-08-15): anon 키로 비공개 select → 빈 배열, 임의 insert → 401 거부
- [x] keep-alive 첫 실행 성공(수동 dispatch, 2026-08-15) + 주기를 주 2회 → 3일 간격으로 변경, Supabase 대시보드 모니터링 시작
- [x] keep-alive 유효성 관찰(관찰 기간 중): 3일 간격으로 충분하다고 가정하지 않고 대시보드에서 일시정지 예고가 없는지 확인, 필요하면 일 1회로 상향 (§4 M1)
- [x] 2주 관찰(2026-08-15 시작, ~08-29): Firebase 프로젝트·이전 환경변수 보존 (롤백 = 이전 커밋 재배포 + env 그대로, §9)
- [x] 관찰 종료 기준값 기록(2026-08-29): Free·서울 리전·Healthy, DB 0.032GB, Storage 0.076GB, Egress 0.25GB·Cached Egress 0.13GB, API 4xx/5xx 0, RAG 424청크·원본 242/242, `media` 831개·77,603,202 bytes
- [x] Firebase Storage URL 전수 검사(2026-08-29): JSONB `data` 8개 테이블에서 Firebase 호스트 0건 확인
- [ ] 로컬 Supabase 기반 RLS 통합 테스트 작성으로 `test:rules` 대체 (§8)
- [ ] Supabase 무료 플랜 백업 자동화: DB·`media`를 age로 암호화해 Google Drive에 주간 보관하고 첫 백업 복구 훈련 통과
- [ ] 관찰 종료 후 해체: firebase·firebase-tools·@firebase/rules-unit-testing 제거(lockfile npm 10 재생성), `firestore.rules`·`storage.rules`·`firestore.indexes.json`·`firebase.json`·`.firebaserc`·`lib/firebase/` 삭제, knip·depcruise 통과
- [ ] 문서 개정: CLAUDE.md(스택·원칙·데이터 모델·env·한도 표·명령어), ADR-0001 각주, `.claude/agents/firebase.md`, troubleshooting 2편 (§10)
- [ ] GCP 예산 알림·카드 등록 정리, Firebase 프로젝트 최종 삭제
