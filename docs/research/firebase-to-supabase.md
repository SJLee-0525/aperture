# Firebase에서 Supabase로 이전 타당성 조사

작성일 2026-08-15. 코드 수정 없이 조사만 진행했다. 저장소 전체를 코드리뷰 수준으로 훑고, 부족한 부분은 Supabase 공식 문서와 외부 자료로 보강했다. 현재 브랜치 `refactor/firebase-to-supabase`에는 커밋이 없고, 저장소에 Supabase 관련 코드나 의존성은 아직 하나도 없다.

> 이 문서는 조사 시점의 기록이다. 이후 확정된 구현 결정이 이 문서의 예시와 다른 부분이 있다
> (관리자 판별은 UID 하드코딩이 아니라 role 클레임, `NEXT_PUBLIC_ADMIN_UID` 제거, 정렬 저장은
> RPC, 블로그 live 저장소 경로 등). 충돌하면 [ADR-0005](../adr/0005-supabase-migration.md)와
> [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md)가 우선한다.

## 1. 결론부터

이전은 가능하고, 난이도는 예상보다 낮다. 이 저장소는 Firebase 고유 기능에 거의 기대지 않는다. `onSnapshot` 실시간 구독 없음, `runTransaction` 없음, `increment` 같은 FieldValue 없음, `firebase-admin` 없음. `writeBatch`는 저장소 전체에서 단 한 곳(`src/lib/firebase/firestore.ts:165`)이다. 공개 읽기는 이미 SDK가 아니라 REST와 `fetch`로 분리돼 있어서 교체 지점이 좁다.

읽기 한도 문제는 이전만으로 해결된다. Supabase 무료 플랜에는 API 요청 횟수 제한이 없어서, Firestore Spark의 하루 5만 읽기 같은 개념 자체가 없다. 읽기는 전송량(egress)으로만 계산되는데 텍스트 콘텐츠 규모에서는 무시할 수준이다. 덤으로 하루 2만 쓰기 한도도 같이 사라진다.

다만 제약이 사라지는 게 아니라 축이 바뀐다. 횟수 제한 대신 용량과 트래픽 제한이 온다. DB 500MB, Storage 1GB, egress 월 10GB(캐시 5GB + 비캐시 5GB), 그리고 7일 무활동 시 프로젝트 일시정지. 이 중 일시정지는 과거에 이 프로젝트가 Supabase를 기각했던 바로 그 이유다(`.claude/memory/decision_stack_firebase.md:14`에 "Supabase 무료 DB의 7일 무활동 일시정지를 거부"라고 기록돼 있다). 되돌아가려면 이 트레이드오프를 다시 받아들여야 한다. 우회책은 5절에 정리했다.

세 질문에 대한 답:

| 질문                                                | 답                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 이전이 가능한가                                     | 가능. 난이도 중하. 위험 지점은 ISR 캐시 결합, Storage URL 마이그레이션, 무활동 일시정지 세 가지                                                     |
| 기존 데이터를 한 번에 옮길 수 있나                  | 가능. Supabase 공식 `firebase-to-supabase` CLI 도구가 Firestore 컬렉션과 Storage 파일을 일괄 이전한다. 단 URL 필드 재작성은 별도 작업               |
| Vercel 캐시를 풀고 DB에서 바로 벡터 조회가 가능한가 | 가능. pgvector가 무료 플랜에 기본 포함이라 질문마다 SQL 한 줄로 유사도 검색이 된다. 현재의 int8 압축 스냅샷 계층(`rag-index.ts`)은 통째로 삭제 대상 |

## 2. 지금 읽기 한도가 모자란 이유

Firestore는 쿼리가 돌려주는 문서 수만큼 읽기를 과금한다. 이 프로젝트에는 컬렉션 전체를 한 번에 읽는 지점이 여러 개 있고, 캐시 무효화가 그 재조회를 반복해서 유발한다. 코드에서 확인한 소진 경로는 다음과 같다.

가장 큰 덩어리는 RAG 스냅샷 캐시의 fill이다. 캐시 미스 1회가 곧 `ragDocuments` 전 청크 읽기, 현재 기준 285 문서 읽기다(`src/lib/firebase/public/rag.ts:36`이 `fresh: true`로 Data Cache를 우회해 매번 원본을 읽는다). 문제는 미스가 생각보다 자주 난다는 것이다. 관리자 저장마다 `revalidateTag(CHAT_PROFILE_CACHE_TAG)`가 실행되므로(`src/lib/cache/revalidate-public.ts:48`, `portfolio-embeddings/route.ts:288`), 편집이 잦은 날은 저장 횟수만큼 캐시가 비워지고 다음 챗 질문이 285건을 다시 읽는다. 저장 50회에 챗 사용이 겹치면 이것만으로 1만 4천 읽기다. 같은 태그를 쓰는 프로필 컨텍스트 캐시(`build-profile-context.ts:217-238`)도 함께 비워져 전 컬렉션을 재조회한다.

관리자 화면은 애초에 캐시가 없다. `admin-list-rest.ts`가 ID token을 붙여 매 방문 컬렉션 전체를 projection 조회한다. 사진 300장이면 목록을 새로고침할 때마다 300 읽기다. RAG 동기화도 소스 데이터를 no-store로 재조회하고(`rag-source.ts`의 `fresh: true`), 전체 재생성은 전 컬렉션 fresh 읽기에 기존 청크 목록 pageToken 순회까지 얹힌다. 공개 revalidate 액션은 과거에 무인증 호출이 가능해 재조회를 강제당할 수 있었으나, 지금은 ID token 검증으로 막혀 있다(`revalidate-public.ts:32`, 개선 이력은 `docs/project-contents/Aperture.md:95-104`). `retry-fetch.ts:32`의 "429는 무료 한도 소진이 대부분이라 재시도하지 않는다"는 주석은 한도 소진이 실제로 겪는 상황임을 방증한다.

요약하면 방문자 트래픽이 아니라 관리자 편집 세션과 챗봇 캐시 미스가 주범이고, ISR과 Data Cache라는 방어선을 저장 동작이 스스로 허무는 구조다. Supabase에는 읽기 횟수 개념이 없으니 이 문제 전체가 청구 축에서 빠진다. 읽기가 소모하는 것은 egress뿐인데, RAG를 pgvector로 옮기면 질문당 285문서 대신 상위 8행만 오가므로 전송량 기준으로도 오히려 줄어든다.

쓰기 쪽도 덤으로 풀린다. 드래그 정렬이 목록 크기만큼 개별 `updateDoc`을 날리는 문제(`src/hooks/use-ordered-admin.ts:78-91`, 항목을 끝에서 끝으로 옮기면 목록 전체가 changed), 모든 관리자 저장에 RAG 청크 삭제 후 재삽입이 딸려오는 문제(fingerprint skip 정책은 `devArticles`에만 적용), 전체 재생성 최대 1,000 쓰기까지, Postgres에는 행 단위 쓰기 과금이 없어 전부 해소된다.

## 3. 무료 한도 비교

| 항목               | Firebase Spark                      | Supabase Free                                                 |
| ------------------ | ----------------------------------- | ------------------------------------------------------------- |
| DB 쓰기            | 2만/일                              | 무제한 (API 요청 수 제한 없음)                                |
| DB 읽기            | 5만/일                              | 무제한                                                        |
| DB 저장            | 1GiB                                | 500MB                                                         |
| 파일 스토리지      | 5GB                                 | 1GB                                                           |
| 스토리지 전송      | 다운로드 1GB/일 (월 약 30GB)        | egress 월 10GB (캐시 5 + 비캐시 5, DB·Storage·Functions 합산) |
| 파일당 업로드 상한 | Rules로 자체 설정 (현재 10MB)       | 50MB 고정                                                     |
| 벡터 검색          | 없음 (findNearest는 별도 요금 체계) | pgvector 기본 포함                                            |
| 이미지 변환        | 없음 (자체 3단 webp로 해결 중)      | 유료 플랜 전용                                                |
| 무활동 일시정지    | 없음                                | 7일 무활동 시 정지, 수동 재개                                 |
| 카드 등록          | Storage 쓰려면 Blaze 전환 필요      | 불필요                                                        |
| 프로젝트 수        | 제한 없음                           | 활성 2개                                                      |

읽어보면 이 프로젝트의 병목이 정확히 반대로 이동한다. 지금 아픈 곳(읽기·쓰기 횟수)은 완전히 풀리고, 지금 여유로운 곳(전송량)이 상대적으로 빡빡해진다. 5절에서 수치로 따져봤다.

## 4. 코드 수준 검토: 무엇을 얼마나 고쳐야 하나

### 4.1 인증: 가장 깔끔하게 넘어가는 영역

관리자 1명 로그인이 전부라 옮길 게 거의 없다. `signInWithEmailAndPassword`는 `supabase.auth.signInWithPassword`로, `onAuthStateChanged`는 `onAuthStateChange`로 거의 1:1 치환된다(`src/lib/firebase/auth.ts`, `src/features/auth/_hooks/use-auth.ts:51`). 계정은 대시보드에서 1개 수동 생성하면 끝이라 사용자 마이그레이션 도구도 필요 없다.

오히려 개선 지점이 있다. 지금 서버 측 토큰 검증(`src/lib/auth/verify-admin-id-token.ts:15-37`)은 요청마다 Google identitytoolkit REST를 왕복한다. Supabase는 비대칭 서명 키가 기본이라 `getClaims()`가 JWKS 공개 키로 로컬 검증한다. 외부 HTTP 왕복이 사라진다. 호출 지점은 4곳이다: `revalidate-public.ts:32`, `portfolio-embeddings/route.ts:253,312`, `image-source/route.ts:18`, `preview-article-markdown.ts:47`.

`NEXT_PUBLIC_ADMIN_UID`(env)와 Rules 안 하드코딩 UID를 수동으로 맞춰야 하는 현재의 이중 관리도, RLS에서 커스텀 클레임(`auth.jwt()`의 role)으로 바꾸면 한 곳으로 합쳐진다. 한국어 에러 맵(`auth.ts:6-14`)은 Supabase 에러 코드 기준으로 다시 써야 한다.

### 4.2 공개 읽기와 ISR: 가장 조심할 곳

이 프로젝트의 무료 한도 방어선은 ISR 캐싱이고, 그 구현이 Next가 패치한 `fetch`의 `next: { revalidate, tags }` 옵션에 강결합돼 있다(`src/lib/firebase/public/transport.ts:137-149`). supabase-js를 그냥 쓰면 자체 fetch 래퍼 때문에 이 옵션이 붙지 않아 캐싱 전략이 통째로 깨진다.

두 가지 대응이 있다. supabase-js 생성자에 커스텀 fetch를 주입하는 방법과, 공개 읽기만 PostgREST를 직접 `fetch` 하는 방법. 후자를 권한다. 지금 `transport.ts`가 Firestore REST에 하는 일과 형태가 같아서 기존 구조와 정합적이고, 태그 기반 무효화(`revalidate-public.ts:35-48`)를 그대로 유지할 수 있다. 태그 접두사 `firestore:`(`src/constants/cache.ts:9-13`)는 이름만 바꾸면 된다.

교체하면서 사라지는 코드가 꽤 많다. Firestore REST의 `{stringValue: ...}` 타입 봉투를 푸는 `decodeValue`/`decodeFields`(`transport.ts:28-53`), Firestore 정렬 규칙의 함정("마지막 정렬 필드가 DESCENDING이면 `__name__`도 DESCENDING")을 회피하는 `publishedQuery` 로직(`transport.ts:66-118`), Timestamp 디코더 4종. Postgres는 `timestamptz`를 ISO 문자열로 주고 `ORDER BY published_at DESC, id ASC`로 끝이라 전부 순수 감산이다. 관리자 목록용 `admin-list-rest.ts`(227줄)는 `transport.ts`와 거의 중복인데, PostgREST의 `.select("title,image,order,published")` 한 줄로 대체되면서 40줄 수준으로 준다.

`retry-fetch.ts`는 그대로 재사용 가능하다. 429를 재시도하지 않는 주석(무료 한도 소진 인지)만 갱신하면 된다.

### 4.3 관리자 쓰기: repository 경계가 최대 자산

`src/lib/admin/select-repository.ts` 기반의 mock/live 이중 구조가 이전 작업의 안전망이다. 저장소 9개(photo, album, dev-project, music 3종, site-config, dev-article, image-store)가 전부 이 경계 뒤에 있어서, live 구현 내부만 갈아끼우면 mock 경로와 관리자 화면은 무손상이다. 예를 들어 `photo-repository.ts:108-120`의 live 어댑터는 8줄이다. 단 dev-article의 live 구현은 `lib/admin/`이 아니라 `src/features/admin-dev-articles/_lib/live-dev-article-repository.ts`에 있고 slug 중복 검사와 태그 CRUD를 함께 감싼다(교체 범위는 계획서 M5 참조).

쓰기 API 사용처는 `setDoc`/`updateDoc`/`deleteDoc`이 대부분이고 전부 단순 CRUD다. merge는 `site.ts:49-56` 한 곳, batch는 사진 삭제 시 앨범 참조 정리(`firestore.ts:162-189`) 한 곳. 후자는 지금 앨범 컬렉션 전체를 읽은 뒤 참조하는 앨범만 골라 batch로 고치는데, Postgres에서는 `photo_ids @> ARRAY[$1]` 조건의 UPDATE 한 문장이거나, 조인 테이블로 정규화하면 `ON DELETE CASCADE`로 끝난다. 조인 테이블로 갈 경우 mock과 공유하는 순수 함수 `remove-photo-from-album.ts`도 같이 손봐야 한다.

`serverTimestamp()` 15곳은 컬럼 DEFAULT `now()`와 BEFORE UPDATE 트리거로 옮기면 애플리케이션 코드에서 전부 사라진다. 문서 ID를 네트워크 없이 선발급하는 패턴(`doc(collection(db, name)).id`)은 Storage 경로 확정에 필수인 규약이라(`firestore.ts:81-84` 주석) `crypto.randomUUID()`로 유지해야 한다.

### 4.4 Storage: 기능은 1:1, 데이터가 문제

업로드/삭제 API는 그대로 대응된다. `uploadBytes`는 `.upload()`, `deleteObject`는 `.remove()`. 이미지 1장당 3단 webp 파생본 3개를 올리는 구조(`use-image-upload.ts:46-59`)도 그대로 간다. 미사용 이미지 스캔의 N+1 문제(`storage.ts:217-233`의 `listAll` 후 객체마다 `getMetadata` 1회, 주석이 직접 "대량 폴더에는 쓰지 않는다"고 인정)는 Supabase `.list()`가 `created_at`과 size를 한 응답에 담아주므로 사라진다.

진짜 비용은 URL이다. `getDownloadURL`이 만든 `firebasestorage.googleapis.com/...?alt=media&token=...` 형태의 절대 URL이 Firestore 문서의 `image.url` 필드에 그대로 저장돼 있다. 파일을 Supabase로 옮기면 이 URL이 전부 죽는다. 재작성 대상은 `photos.image`, `albums.cover`, `musicWorks.poster`, `devProjects.cover`와 `images[]`, `devArticles.cover`, 그리고 블로그 본문 Markdown 안에 박힌 이미지 주소까지다. 마지막 항목이 까다로운데, 다행히 `article-body-storage-paths.ts`가 본문에서 Storage 경로를 파싱하는 로직을 이미 갖고 있어서 재작성 스크립트의 재료가 된다. 경로(`path`) 필드는 문서에 함께 저장돼 있으므로, path 기준으로 새 공개 URL을 생성해 url 필드를 덮는 일괄 UPDATE로 처리할 수 있다.

연동 수정 지점: `next.config.ts:16-27`의 `remotePatterns` 호스트, `storage-source-url.ts:14-19`의 호스트 화이트리스트, Sentry 스크러버(`scrub-event.ts:7`)의 Authorization 헤더 처리 확인.

### 4.5 Security Rules에서 RLS로

`firestore.rules` 65줄은 거의 기계적으로 번역된다. 8개 컬렉션이 전부 같은 패턴("published면 공개 읽기, 관리자면 전부")이고, RLS로 쓰면 이렇다.

```sql
create policy "public read published" on photos
  for select using (published or auth.uid() = '<admin-uuid>');
create policy "admin write" on photos
  for all using (auth.uid() = '<admin-uuid>');
```

위 정책의 UUID 하드코딩은 조사 시점 예시다. 최종 결정은 role 클레임 단일 출처다(ADR-0005). 복합 인덱스 7개(`firestore.indexes.json`)는 `create index on photos (published, "order")` 형태로 1:1 대응된다. Storage Rules의 10MB, image/* 제한은 버킷 레벨 `file_size_limit`과 `allowed_mime_types` 설정으로 오히려 선언적으로 바뀐다.

숨은 비용이 하나 있다. `@firebase/rules-unit-testing` 기반의 `npm run test:rules`(`test/security-rules.test.mjs`)는 하네스 자체를 못 옮긴다. RLS 테스트는 로컬 Supabase(Docker)에서 pgTAP이나 별도 통합 테스트로 다시 짜야 한다.

주의할 아키텍처 충돌이 하나 더 있다. 지금 RAG 쓰기 라우트는 브라우저의 Firebase ID token을 그대로 Firestore REST에 붙여 Rules가 인가하는 구조다(`route.ts:88,116,237`). Supabase에서는 route handler가 service_role 키를 들거나, 사용자 JWT를 전달해 RLS로 인가받아야 한다. 후자면 "Rules(RLS)가 보안 경계 전부"라는 CLAUDE.md 원칙 1을 유지할 수 있다. 전자를 택하면 원칙 수정이 필요하니 ADR로 남기는 게 좋다.

### 4.6 직접 대응물이 없는 Firebase 기능

없다. 조사 결과 가장 가까운 후보가 `serverTimestamp()`인데 이건 DB DEFAULT가 더 나은 답이고, `Timestamp` 값 타입은 이미 3곳에서만 쓰이며 경계에서 `Date`로 정규화돼 있다. 실시간 구독을 안 쓰는 게 결정적이다. Supabase Realtime을 붙일 필요가 없다.

## 5. 리스크와 트레이드오프

### 7일 무활동 일시정지

가장 큰 구조적 차이다. 방문자가 일주일간 아무도 안 오면 프로젝트가 정지되고, 대시보드에서 수동으로 깨워야 한다. 포트폴리오 사이트에 정지 화면이 뜨는 건 최악의 시나리오다.

완화책은 정기 ping이다. GitHub Actions cron으로 주 2회 정도 아무 쿼리나 날리면 된다(공개 repo면 무료). ISR 때문에 방문자 트래픽이 원본 DB까지 안 닿을 수 있으므로, ping은 반드시 Supabase API를 직접 때려야 한다. 다만 GitHub Actions 스케줄은 지연되거나 드물게 건너뛸 수 있어서, 7일 기한 대비 주 2회면 충분한 마진이다. 이 운영 부담을 받아들일지가 이전 결정의 첫 관문이다. 과거 기각 사유였던 만큼 명시적으로 재결정하고 기록하길 권한다.

### egress 월 10GB

Firebase는 Storage 다운로드만 하루 1GB(월 약 30GB)인데 Supabase는 전체 합산 월 10GB다. 이 프로젝트는 이미지를 CDN 최적화 없이 Storage에서 직접 서빙하므로(`next.config.ts:14`의 `unoptimized: true`) 이미지 트래픽이 전부 egress에 잡힌다.

대략 계산하면, 2048px webp 메인이 장당 300~~500KB라 치면 캐시 egress 5GB는 월 1만~~1만 5천 뷰 수준이다. 개인 포트폴리오 트래픽이면 보통 여유가 있지만, 채용 시즌에 링크가 돌거나 지도 페이지에서 썸네일이 무더기로 로드되는 시나리오는 계산해볼 필요가 있다. Supabase Storage 공개 버킷은 CDN을 타므로 반복 조회는 단가가 싼 캐시 egress로 잡히는 점은 유리하다. 초과해도 프로젝트가 죽는 게 아니라 다음 결제 주기까지 제한되는 방식이지만, 무료로 버티려면 이 한도가 실질 상한이다.

### Storage 1GB

Firebase의 5GB에서 1GB로 줄지만, 현재 버킷 사용량이 약 70MB라 당장은 결정 변수가 아니다. 이미지 1장이 3단 파생본 합쳐 대략 400~600KB이므로, 남은 930MB면 지금 같은 webp 압축 기준으로 1,800장 안팎을 더 올릴 수 있다. 다만 5GB 감각으로 쓰던 습관은 버려야 하니, 사용량 80% 근처에서 알림을 받도록 대시보드에 설정을 걸어두면 충분하다.

### DB 500MB

문제없다. 콘텐츠가 텍스트와 메타데이터뿐이고, RAG 벡터도 512차원 float4 기준 행당 2KB 남짓이라 1,000청크를 다 채워도 수 MB다. Postgres 시스템 오버헤드를 감안해도 이 프로젝트가 500MB를 채울 경로가 없다.

### ISR 결합 (4.2절 참조)

기술적으로 가장 실수하기 쉬운 지점이다. PostgREST 직접 fetch로 가면 리스크가 거의 사라지지만, supabase-js를 무심코 서버 렌더에 쓰면 캐싱이 조용히 무력화되고 무료 한도 방어선이 뚫린다. 이건 Firestore 클라 SDK를 서버 렌더에 쓰지 말라는 현재 원칙 6과 정확히 같은 종류의 함정이다.

## 6. 기존 데이터를 한 번에 옮기는 방법

가능하다. Supabase가 공식 마이그레이션 도구를 제공한다.

### Firestore 데이터: firebase-to-supabase 도구

[공식 가이드](https://supabase.com/docs/guides/platform/migrating-to-supabase/firestore-data)의 절차는 세 단계다.

```bash
git clone https://github.com/supabase-community/firebase-to-supabase
# firestore/ 디렉토리에서
node collections.js                  # 컬렉션 목록 확인
node firestore2json.js photos        # 컬렉션을 JSON으로 덤프
node json2supabase.js photos.json    # JSON을 Postgres 테이블로 삽입 (PK 전략: firestore_id 선택 가능)
```

컬렉션 하나가 테이블 하나로 평탄화되고, 컬럼 타입은 text, numeric, boolean, jsonb 중 하나로 잡힌다. 이 프로젝트의 `{ko, en}` 이중언어 map, `exif` map, `image` map, `photoIds` 배열 같은 중첩 구조는 jsonb 컬럼으로 들어간다. 쿼리 패턴이 "전체 fetch 후 클라이언트 필터"라서 처음부터 완전 정규화할 필요는 없고, jsonb로 받은 뒤 필요한 컬럼(`published`, `order`, `published_at` 등 인덱스 대상)만 뽑아내면 된다. 컬렉션 이름과 같은 이름의 `.js` 훅 파일을 두면 덤프 시점에 키 변경, 파생 컬럼 계산, `writeRecord()`로 별도 테이블 분리까지 할 수 있어서 Timestamp를 ISO 문자열로 바꾸는 변환도 이 단계에서 처리 가능하다.

옮길 컬렉션은 10개다: `photos`, `albums`, `musicWorks`, `musicAwards`, `musicMedia`, `devProjects`, `devArticles`, `devArticleTags`, `site`, `ragDocuments`. 이 중 `ragDocuments`는 그대로 옮기기보다 7절대로 pgvector 스키마에 맞춰 새로 재생성하는 편이 낫다(관리자 화면에 전체 재생성 버튼이 이미 있다). `site`는 문서 3개짜리 설정이라 손으로 옮겨도 된다.

한 가지 주의: 이 도구는 Firebase 서비스 계정 키(`firebase-service.json`)를 요구한다. 이 저장소는 hook이 서비스 계정 키 파일을 차단하고 CLAUDE.md가 firebase-admin을 금지하는데, 그 원칙은 앱 런타임에 관한 것이다. 마이그레이션은 저장소 밖 별도 디렉토리에서 1회성으로 돌리고, 끝나면 키를 즉시 폐기하면 원칙과 충돌하지 않는다.

### Storage 파일: 같은 저장소의 download/upload 스크립트

[공식 가이드](https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-storage)에 따라 같은 도구의 storage 디렉토리에서 두 명령으로 처리한다.

```bash
node download.js photos ./downloads 100   # Firebase 버킷에서 로컬로 (prefix 단위, 배치 크기 지정)
node upload.js photos ./downloads photos  # 로컬에서 Supabase 버킷으로
```

`photos/`, `music/`, `dev/`, `dev-blog/` 프리픽스별로 돌리면 된다. 없는 버킷은 비공개로 자동 생성되므로, 업로드 후 대시보드에서 공개 설정을 잡아야 한다.

### 도구가 안 해주는 것: URL 재작성

파일과 문서를 다 옮겨도 문서 안의 `image.url` 필드는 여전히 firebasestorage.googleapis.com을 가리킨다. 4.4절에서 정리한 필드들을 `path` 기준으로 새 공개 URL(`https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>`)로 덮는 일괄 UPDATE 스크립트를 한 번 돌려야 한다. 블로그 본문 Markdown 내부 주소는 문자열 치환으로 처리하되, `article-body-storage-paths.ts`의 파싱 로직을 참고해 경로 목록을 뽑으면 안전하다. 마이그레이션 전 과정에서 실수 여지가 가장 큰 단계이므로, 옮긴 뒤 구 URL이 문서에 남아 있는지 검증 쿼리(`like '%firebasestorage%'`)로 확인하는 걸 권한다.

### Auth

관리자 계정 1개뿐이라 마이그레이션 도구가 필요 없다. Supabase 대시보드에서 계정을 만들면 끝이다. 관리자 판별은 최종적으로 UUID·env가 아니라 `app_metadata.role = "admin"` 클레임으로 확정됐다(ADR-0005).

## 7. RAG: Vercel 캐시를 풀 수 있는가

가능하고, 이전의 최대 수혜 영역이다.

### 현재 구조

벡터는 Firestore `ragDocuments` 컬렉션에 512차원 double 배열로 저장돼 있다(현재 285청크). Firestore에는 벡터 검색이 없으므로, 챗 요청 시 전 청크를 읽어 int8 양자화 + base64로 압축한 스냅샷을 Vercel Data Cache에 1시간 캐시하고(`src/lib/ai/rag-index.ts:29-88`), 검색은 인메모리 코사인 순회로 한다(`src/lib/ai/rag-search.ts:65-96`). 이 구조의 제약이 코드와 문서에 그대로 적혀 있다.

- Data Cache 항목당 2MB 한계가 코퍼스 상한이다. 현재 457KB로 한도의 23%. 경고선(1.5MB)까지 약 650청크, 절벽까지 약 960청크. 블로그 1편이 15청크 안팎이라 40편쯤 더 쓰면 경고가 뜬다(`docs/checklist/07-dev-blog.md:568`). 한도를 넘으면 Next가 캐시를 건너뛰어 매 요청 전체 재조회로 조용히 강등된다.
- 캐시 미스 1회마다 Firestore 문서 285건 읽기와 수 MB 전송이 몰린다.
- 갱신 반영이 최대 1시간 늦고, 동기화 트리거가 브라우저 fire-and-forget이라 실패하면 무효화도 안 된다.
- 한 번에 갱신 가능한 문서가 1,000개로 하드 제한돼 있다.
- `rag-index.ts:81`의 경고 문구가 이미 "Firestore findNearest 이전을 검토하세요"라고 다음 단계를 예고하고 있다.

### pgvector 이후 구조

발행 시 임베딩을 pgvector 컬럼(`vector(512)`)에 upsert하고, 챗 요청마다 DB에서 직접 조회한다.

```sql
select id, text, source_type, source_id,
       1 - (embedding <=> $query) as similarity
from rag_documents
where published and embedding_model = $model_key
order by embedding <=> $query
limit 8;
```

스냅샷 캐시, int8 양자화, base64 패킹, 2MB 경고가 전부 필요 없어진다. `rag-index.ts`(93줄)는 파일째 삭제 대상이고, `src/lib/firebase/public/rag.ts`의 전 청크 fetch도 사라진다. "그때그때 DB에서 조회"가 정확히 pgvector의 기본 사용법이고, Supabase 무료 플랜에 확장이 기본 포함이라 추가 비용도 없다. 갱신은 upsert 즉시 다음 질문부터 반영된다. 1시간 지연도, `revalidateTag` 결합도, 1,000문서 가드도 없다. 질문당 읽는 양도 전 청크 285건에서 상위 8행으로 줄어, 읽기 한도 문제의 최대 소진원이 사라진다.

쓰기 쪽도 크게 준다. 현재 `portfolio-embeddings/route.ts:142-248`의 Firestore REST commit 조립(200쓰기/커밋 분할, pageToken 순회, 타입 봉투 인코딩)이 `insert ... on conflict do update` 와 `delete where source_id = $1 and id <> all($2)` 두 문장으로 축약된다.

### 옮길 때 챙길 것

그대로 이식하면 안 되는 디테일이 셋 있다. 첫째, 현재 검색은 순수 벡터가 아니라 하이브리드다. `vectorScore + keywordScore * 0.35`에 하한 필터와 방문자 화면 문맥 우선 슬롯 3개가 얹혀 있다(`rag-search.ts:69-96`). SQL로 다 밀어넣기보다, 벡터 검색으로 후보 30~~50개를 받아 기존 키워드 스코어와 우선 슬롯 로직을 후처리로 유지하는 편이 동작 보존에 안전하다. 둘째, pgvector 컬럼은 차원이 고정이라 임베딩 차원을 바꾸면 컬럼 마이그레이션이 필요하다. `모델명@차원` 키 검증(`embedding.ts:28-36`)은 그대로 유효하니 유지한다. 셋째, 인덱스는 서두를 필요 없다. 285~~1,000청크 규모면 인덱스 없는 순차 스캔이 이미 밀리초 단위다. HNSW는 수만 건부터 의미가 있다.

임베딩 생성(OpenAI 호출), 청킹 규칙, fingerprint skip 정책, 챗 파이프라인은 전부 그대로 남는다. 바뀌는 건 저장과 조회 계층뿐이다.

## 8. 이전 후에도 ISR을 유지하는가

유지한다. 다만 현재 캐시는 한 덩어리가 아니라 세 계층이고, 각각 운명이 다르다.

공개 페이지 ISR(1시간 revalidate + 태그 무효화)은 그대로 둔다. 근거는 네 가지다. 첫째, 신선도 문제가 이미 해결돼 있다. ISR의 단점은 stale인데, 이 프로젝트는 관리자 저장 시 `updateTag`와 `revalidatePath`로 즉시 무효화하는 배관이 작동 중이라(`src/lib/cache/revalidate-public.ts:35-48`) 1시간 주기는 안전망일 뿐이다. ISR을 버려서 얻는 신선도 이득이 없다. 둘째, egress 절약. Supabase에서 읽기는 횟수 무제한이지만 전송량으로 청구되므로, 방문자 요청마다 DB를 왕복할 이유가 없다. 텍스트 JSON이 아낀 만큼 이미지 트래픽에 여유가 간다. 셋째, 장애와 일시정지의 완충이 된다. ISR은 재생성에 실패하면 기존 캐시를 계속 서빙하므로, keep-alive 핑이 놓쳐 프로젝트가 정지돼도 공개 페이지는 stale 상태로 떠 있고 죽는 것은 챗봇 정도다. 매 요청 SSR로 바꾸면 Supabase 정지가 곧 사이트 전체 다운이 된다. 넷째, 정적 서빙이 매 요청 DB 왕복보다 빠르고 Vercel Hobby의 함수 실행량도 아낀다.

RAG 스냅샷 캐시(`rag-index.ts`)는 제거한다. 7절대로 pgvector 질문당 조회가 대체한다. Firestore에 벡터 검색이 없어서 생긴 우회물이지 ISR 전략의 일부가 아니다.

프로필 컨텍스트 캐시(`build-profile-context.ts:217-238`)는 유지를 권한다. 챗 요청마다 전 컬렉션을 모아 요약을 만드는 계층이라, 벡터 검색이 DB로 가더라도 이 캐시의 가치는 그대로다.

정리하면 이전으로 바뀌는 것은 ISR의 역할이다. 지금은 캐시가 없으면 한도가 터지는 필수 장치지만, 이전 후에는 없어도 안 터지되 있으면 빠르고 싸고 장애에 강한 선택지가 된다. 걷어낼 것은 Firestore의 부재를 메우던 우회 코드지 ISR 자체가 아니다. 한 가지 부수 효과로, ISR이 방문자 트래픽을 DB에서 가리기 때문에 무활동 판정을 막는 keep-alive 핑은 반드시 Supabase API를 직접 호출해야 한다(5절 참조).

## 9. 이전한다면 권장 순서

1. 트레이드오프 재결정을 ADR로 기록한다. 특히 7일 일시정지 수용 여부와 keep-alive 방식, 그리고 RAG 쓰기 라우트의 인가 모델(service_role vs 사용자 JWT + RLS).
2. Firebase 콘솔에서 월 다운로드 트래픽을 확인한다. Storage 사용량은 약 70MB로 이미 확인돼 1GB 한도에 여유가 있고, 남은 변수는 egress 월 10GB와의 비교뿐이다.
3. 스키마와 RLS를 만들고, 저장소 밖에서 공식 도구로 데이터와 파일을 이전한 뒤 URL 재작성 스크립트를 돌린다.
4. `src/lib/admin/*-repository.ts`의 live 구현부터 교체한다. repository 경계 덕에 mock 경로와 화면이 무손상이라 가장 안전한 시작점이다.
5. `src/lib/firebase/public/`을 PostgREST 직접 fetch로 교체한다. `next: { revalidate, tags }` 유지가 성공 조건이고, 기존 transport 테스트가 회귀 안전망이다.
6. RAG를 pgvector로 옮기고 `rag-index.ts`를 삭제한다. 관리자 전체 재생성 버튼으로 인덱스를 새로 만든다.
7. dnd `updateOrder`를 일괄 upsert 시그니처로 바꾼다. 이건 이전과 무관하게 지금 해도 이득이다.
8. Rules 테스트를 대체할 RLS 검증을 만들고, `firebase.json`, rules 파일, firebase 의존성 3종을 제거한다.

## 10. 참고 자료

- [Migrate from Firebase Firestore to Supabase (공식)](https://supabase.com/docs/guides/platform/migrating-to-supabase/firestore-data)
- [Migrate from Firebase Storage to Supabase (공식)](https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-storage)
- [firebase-to-supabase 도구 저장소](https://github.com/supabase-community/firebase-to-supabase)
- [Supabase pgvector 가이드 (공식)](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase JWT Signing Keys (공식)](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase egress 관리 (공식)](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Supabase Storage 파일 한도 (공식)](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase 무료 플랜 한도 정리 (2026)](https://costbench.com/software/database-as-service/supabase/free-plan/)
- [무활동 일시정지 방지 keep-alive 사례](https://github.com/travisvn/supabase-inactive-fix)
- [GitHub Actions cron으로 keep-alive 구성](https://dev.to/krishna-builds-dev/how-to-keep-your-supabase-free-project-active-no-cost-cron-with-github-actions-1nnd)
- [Firestore 무료 한도 (공식)](https://firebase.google.com/docs/firestore/quotas)
