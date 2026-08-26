# 아키텍처

이 저장소의 구조 규칙은 선언만 있고 새는 종류가 아니다. `app → features → components` 방향,
barrel 금지, `../` 금지, feature 내부 하위폴더 규칙을 전부 기계로 재집계했고 위반이 사실상 없다.
정적 도구 네 개(`tsc --noEmit`, ESLint, dependency-cruiser, knip)가 전부 무결과로 통과한다.

그래서 이 편에 남은 것은 도구가 볼 수 없는 층위의 문제다. 성격은 두 가지로 갈린다.
하나는 같은 코드가 여러 벌 존재해서 한쪽 수정이 다른 쪽에 도달하지 않는 경우다. 이건 이론이 아니라
이미 관측된 버그를 낳았다. 다른 하나는 개념 하나가 여러 파일에 흩어져 "이걸 바꾸려면 어디를 보나"의
답이 파일마다 다른 경우다. 후자는 대부분 지금 아프지 않고, 그래서 뒤로 미룰 수 있다.

한 가지 더. 여러 항목이 같은 파일을 건드린다. 우선순위 순서대로 하나씩 착수하면 같은 파일을
서너 번 고치게 된다. 어느 것을 묶어야 하는지는 아래 「묶어야 하는 것」에 따로 적었다.

## 규칙이 지켜지고 있다

측정값부터.

| 항목 | 값 |
| --- | --- |
| `components → features` 역방향 import | 0건 |
| `features → app` 역방향 import | 0건 |
| `lib`·`constants`·`types`·`mocks` → `features` | 0건 |
| barrel `index.ts` | 0개 |
| `../` 상대경로 import | 1건 (`features/lang/_lib/proxy-locale.test.ts:6`, 테스트가 `src/proxy.ts`를 부르는 구조적 예외) |
| feature 간 직접 참조 | 28쌍, 전부 `eslint.config.mjs:47-52`의 platform 화이트리스트 안 |
| knip (미사용 파일·export·의존성) | 0건 |
| dependency-cruiser | 1,079 모듈, 위반 0건 |
| jscpd | 1.29% (36 clones / 687줄) |
| 공개 라우트 `generateMetadata` 누락 | 0건 (17/17이 `lib/seo/metadata.ts`의 `pageMetadata` 경유) |
| 데이터 계층 `any` | 0건 (`as unknown as` 7곳, 전부 supabase-js 응답 타입 우회) |

feature 내부 하위폴더 규칙도 `_types/` 폴더 2개를 빼면 지켜진다(그 2개는 규약 편 CONV-02가 다룬다).

데이터 계층에서 특히 잘 잡힌 것 두 가지를 적어 둔다. PostgREST의 `max_rows` 절단 방지가 전량 조회
경로 5개 전부에 걸려 있다. `paginateAll`(`lib/supabase/paginate-all.ts:29`)이 요청 크기가 아니라 받은
행 수만큼 offset을 늘리고, 공개 전량 조회·관리자 CRUD 목록·관리자 projection 목록·태그 목록·RAG id
조회가 모두 이걸 통과한다. 그리고 정렬 2차 키(`id.asc`)가 `constants/collections.ts`의 서술자에
봉인돼 있어 REST 경로와 SDK 경로의 정렬이 한 출처에서 나온다.

원칙 5(`service_role` 금지)와 원칙 6(공개 읽기는 PostgREST fetch, 쓰기·관리자 읽기는 supabase-js)도
도달 경로를 전수 추적한 결과 침범이 없다. 서버 렌더 경로에서 supabase-js에 닿는 곳이 없고,
`apikey` 헤더는 publishable key, `Authorization`은 사용자 access token으로 일관되게 분리돼 있다.

## 지금 아픈 것

여기 넣은 항목은 전부 "지금 고장 나 있거나, 이미 결함을 하나 이상 낳았다"는 기준을 통과했다.

### 관리자 CRUD 껍데기 6~7세트 복붙, 그리고 그 로직이 `app/`에 있다 (ARCH-A-03, 높음)

편집 라우트 7개(`app/admin/albums/[id]/page.tsx` 외 6개)가 `type Status = "loading"|"found"|"missing"|"error"`
선언, `useEffect` 로드, `alive` 플래그, 4분기 렌더까지 동일하다. 다른 것은 Form 이름, repository getter,
타입, state 이름, 한국어 명사 3개뿐이다. 목록 컴포넌트 6개는 드래그 힌트 문구("드래그로 순서를 조정합니다.
공개 배지를 눌러 표시 여부를 바꿉니다.")가 글자까지 같다.

CSS는 더 심하다. 직접 확인한 값이다.

- `page.module.css` 7개의 md5가 전부 `278598491e7bd6912267e76e2529056d`로 바이트 동일
- `AdminPhotosList.module.css` ↔ `AdminMusicWorksList.module.css`의 `diff` 결과가 1번 줄 주석 한 줄
- `AwardForm.module.css` ↔ `MediaForm.module.css` ↔ `AlbumForm.module.css`의 `diff` 종료코드 0

로딩 문구 하나를 바꾸려면 라우트 7파일을 고쳐야 한다. 드리프트도 이미 시작됐다. `admin-albums`만 100줄로
`coverUrl` prop이 붙었고, `photos/[id]`만 58줄이며 JSDoc이 없다. 데이터 계층은 `useOrderedAdmin` +
`listCrud` + `selectRepository` 3층으로 이미 깊게 잡혀 있는데, 그 이득이 UI 계층에서 다시 새고 있다.

무엇을 만드는가.

- `src/hooks/use-admin-doc-load.ts`에 `useAdminDocLoad<T>(getRepository, id) => {doc, status, error}` (약 40줄).
  7개 라우트가 이 훅 한 줄 + Form 렌더 15줄로 줄어든다.
- `src/features/admin-shell/_components/AdminDocGate.tsx`가 loading/missing/error 3분기 렌더를 흡수한다.
- `src/features/admin-shell/_components/AdminSortableListPage.tsx`가
  `{title, hint, newHref, newLabel, emptyText, items, status, error, onReorder, renderRow}`를 받는다(약 70줄).
- `src/features/admin-shell/_components/AdminSortableRow.tsx`가 드래그 핸들·공개 배지·수정/삭제 버튼을 흡수하고
  가운데 컬럼만 각 feature가 `children`으로 넣는다.
- CSS는 `admin-shell/_components/`에 `admin-list.module.css`, `admin-row.module.css`, `admin-form.module.css` 3벌.

절감 추정은 TSX 약 850줄, CSS 약 1,210줄. 착수는 CSS 통합 3건부터 하는 게 맞다. `diff`가 0이거나
주석 한 줄이라 무위험이고, 그 3건이 끝나면 나머지 구조 변경의 시야가 트인다.

### 수상 목록·모달 복붙이 이미 결함 2건을 낳았다 (ARCH-A-05, 높음)

`MusicCareerView.tsx:52-85`와 `DevCareerView.tsx:68-113`이 같은 "수상(Award)" 개념을 두 벌로 다룬다.
CSS는 13개 규칙 블록이 값 단위로 동일하고 클래스명만 다르다(`.row`↔`.awardRow`, `.yr`↔`.awardYear` 등).

여기까지는 흔한 중복이다. 문제는 그 복붙에서 이미 두 가지가 갈라졌다는 것이다.

- `MusicCareerView.module.css`에 `@media` 규칙이 0개다. `DevCareerView.module.css:133`에만
  `@media (max-width: 640px)` 줄바꿈 보정이 있다. 좁은 화면에서 음악 수상 행의 `place`가 밀린다.
- 음악 수상은 챗봇 문맥 등록(`MusicCareerView.tsx:34-36`)과 WebMCP `LIST_AWARDS_TOOL`
  (`use-music-tools.ts:40,135`)을 갖는데, 개발 수상은 둘 다 없다. `use-dev-tools.ts`에서 `award` 문자열은
  프롬프트 설명 한 줄이 전부다.

실제 도메인 차이는 두 개뿐이다. `place` 타입이 음악은 `string`, 개발은 `LocalizedText`이고, 개발에만
`projectLink`가 있다.

`src/components/AwardList.tsx`(+ 짝 CSS)를 만들어 `{awards: {id, year, name, place?}[], label, onSelect}`를
받게 한다. `place`는 호출부가 이미 `string`으로 만들어 넘긴다(개발은 `pickText` 후). 상세는
`src/components/AwardDetailModal.tsx`가 `{award, label, open, onClose, children?}`을 받고, 개발의
`projectLink`는 `children`으로 주입한다. 두 View는 데이터 투영과 조립만 남는다. 같은 작업에서
`use-dev-tools.ts`에 `LIST_DEV_AWARDS_TOOL`을 추가해 비대칭을 없앤다.

### mock과 live의 계약이 세 지점에서 갈라져 있다 (ARCH-D-03, 중간)

`lib/content/chat.ts:56-73`의 `pickPublicFields`가 mock 분기에서 `MOCK_DEV_PROJECTS`, `MOCK_MUSIC_WORKS`,
`MOCK_MUSIC_AWARDS`, `MOCK_MUSIC_MEDIA`, `MOCK_PHOTOS`, `MOCK_ALBUMS`를 published 필터도 정렬도 없이
그대로 반환한다. `articles`(`:63-72`)만 필터와 정렬을 한다. live 분기(`:90-107`)는 전부 published 게이트를
통과한다. 지금 mock 데이터에 `published: false`가 `dev-articles.ts:493` 한 줄뿐이라 드러나지 않을 뿐이고,
mock에 초안 사진 하나만 추가하면 초안이 챗봇 문맥으로 샌다.

나머지 둘. `local-list-repository.ts:224-228`의 `remove`가 존재 검사 없이 `filter`로 지워서 없는 id도
성공하는데, live는 `list-crud.ts:208-214`에서 0행을 실패로 처리한다. 그리고 `lib/content/dev.ts:13-18`의
`getDevProject`가 mock 모드에서만 `MOCK_DEV_PROJECT_DETAILS`로 폴백해서, mock에서 열리는 `?project=recipedia`
딥링크가 live에서는 `null`이다.

결정적인 사실은 이것이다. `src/lib/content/`의 mock/live 분기 getter 중 테스트가 있는 것은
`dev-articles.ts` 하나다. 계약이 갈라지는 바로 그 자리가 무방비다.

`src/lib/content/mock-list.ts`에 `publishedInOrder<T extends {order:number; published:boolean}>(items: T[]): T[]`를
두고 `content/photo.ts`, `music.ts`, `dev.ts`, `chat.ts`가 전부 이걸 쓰게 한다. 지금 `chat.ts`만 빠져 있다는
사실이 눈으로 보이게 된다. `local-list-repository.remove`에는 `patch`와 같은 존재 검사를 넣는다.

### 문서와 주석이 존재하지 않는 Firestore를 설명한다 (ARCH-D-10, 중간)

`src/**` 비테스트·비mock 기준 64줄 / 44파일이 Firebase를 서술한다. 그중 특히 해로운 것들.

- `types/music.ts:10`과 `types/photo.ts:20`의 "Firestore Timestamp ↔ 래퍼가 변환"은 거짓이다. 실제 저장은
  ISO 문자열이다. 이 주석이 아래 날짜 폴백 결함(BUG-S-02)의 조사를 오도한다.
- `lib/content/normalize-troubleshooting.ts:20`은 삭제된 `firestore-rest.ts`를 근거로 "firebase import 금지"
  규칙을 말한다. 존재하지 않는 파일이 규칙의 근거다.
- `vitest.config.ts:13`은 "repository 조립 모듈은 firebase 를 끌고 오므로"라는 거짓 근거로 커버리지
  allowlist를 좁히고 있다. 잔재 주석이 게이트를 실제로 좁히는 유일한 사례다.

CLAUDE.md 구조도 드리프트도 같은 부류다. 문서가 가리키는 `src/features/export/`와 `FRAME_STYLES` 상수는
존재하지 않는다. 반대로 문서에 없는 feature가 12개 있다(`chat`, `search`, `sentry-triage`, `custom-cursor`,
`custom-scrollbar`, `motion`, `monitoring`, `webmcp`, `site-footer`, `admin-maintenance`, `admin-shell`,
`admin-global`). `src/` 최상위의 `assets/`, `utils/`, `instrumentation.ts`, `instrumentation-client.ts`,
`proxy.ts`도 문서에 없다. `docs/adr/0001-serverless-rag.md`는 벡터를 Firestore `ragDocuments`에 저장한다고
서술하며, ADR-0005가 이를 대체했는데 개정 표기가 없다.

주의할 점 하나. 64줄을 일괄 삭제하면 안 된다. `gallery/_hooks/use-infinite-scroll.ts:5-9`("진짜 Firestore
페이지네이션이 아니라")는 왜 윈도잉인가라는 무료 한도 근거를 담고 있고, `dev-article-sort.ts`의 주석에는
초안에 정렬 축이 없다는 도메인 근거가 들어 있다. 이런 것은 삭제가 아니라 단어 치환 대상이다.
CLAUDE.md 완료 점검 1번("이 주석이 없으면 코드에서 알 수 없는 정보가 사라지는가?")을 각 줄에 적용하면
실제 삭제는 절반 이하다.

## 데이터 계층

### 디코더가 컬렉션마다 2~3벌이고 규칙이 다르다 (ARCH-D-01 + ARCH-D-02 + ARCH-D-07)

**이 셋은 한 작업의 부분이다. 따로 착수하면 같은 파일을 세 번 고친다.**

같은 행을 같은 도메인 타입으로 바꾸는 코드가 컬렉션마다 2~3벌 있고, 폴백이 서로 다르다.

| 필드 | 공개 | 관리자 get | 관리자 list |
| --- | --- | --- | --- |
| `MusicWork.performedAt` | epoch (`transport.ts:35-38`) | **현재 시각** (`music.ts:23-26`) | epoch (`admin-list.ts:111`) |
| `Photo.image` | `?? EMPTY_IMAGE` (`public/photo.ts:58`) | 폴백 없음 (`photos.ts:56`) | `?? {url:"",...}` (`admin-list.ts:47`) |
| `Photo.title` | `asText` (형 검증 있음) | `as ... ?? EMPTY_TEXT` (형 검증 없음) | `asText` |

`ticketUrl`·`links`의 공개/관리자 차이는 문서화된 의도다. 날짜와 `image` 폴백 차이는 그렇지 않다.
날짜 폴백이 `new Date()`라는 사실이 실제 데이터 오염 경로를 만든다(정확성 편 BUG-S-02: 썸네일
마이그레이션이 읽은 문서를 통째로 되쓰기 때문에 실행 시각이 공연일로 영속된다). `photos.ts:56`은
타입이 `ImageMeta`라고 선언하는데 런타임 값은 `undefined`일 수 있다.

물리 테이블 이름은 세 군데에서 각자 정의된다. 서술자(`collections.ts:52-93`)가 `Partial<Record<...>>`라
쓰기 모듈이 `SUPABASE_COLLECTIONS[...]?.table ?? "리터럴"` 폴백을 강제당한다(7곳). `admin-list.ts:53,69,87,104,128,152`는
서술자를 아예 참조하지 않고 테이블명과 `["sort_order","id"]`를 하드코딩한다. `sort-rpc.ts:6-13`은 또
별도 표다. 현재 값은 전부 일치하지만, `?? "리터럴"`은 서술자가 사라져도 오류 없이 동작해서 계약을
무력화한다.

디코더의 필드 읽기는 전부 무검증 캐스팅이다. 파일별 `as` 캐스트 수는 `supabase/music.ts` 17,
`public/photo.ts` 16, `supabase/dev.ts` 16 등이고, 실제로 형을 검사하는 것은 `asText`,
`normalizeTroubleshooting`, `normalizeDevAwards`, `sanitizePublicLinks` 넷뿐이다. `?? `는 `null`과
`undefined`만 막고 `"3"`이나 `{}`는 통과시킨다. `order`에 문자열이 들어오면 정렬이 `NaN`을 내고
순서가 무너지는데 어디서도 오류가 나지 않는다.

한 작업으로 묶으면 이렇게 된다.

1. `src/lib/supabase/decode/field.ts`에 최소 필드 리더를 둔다. `readString`, `readNumber`, `readBoolean`,
   `readStringArray`, `readImage`, `readImageOrNull`, `readDate`(epoch 폴백), `readNullableDate`.
   `asText`는 이 집합의 기존 멤버로 편입한다.
2. `src/lib/supabase/decode/photo.ts`의 `decodePhoto(id, data): Photo`처럼 컬렉션별 정규화 디코더를
   한 벌만 둔다. 위 필드 리더만 쓰므로 캐스팅이 0이 되고, 폴백은 여기서 한 번만 정한다.
3. 공개 전용 정화는 `decode/public-sanitize.ts`의 `sanitizeForPublic(work)`로 분리한다. 공개 fetcher는
   디코더 뒤에 이걸 얹고, 관리자는 디코더만 부른다. "왜 두 벌인가"가 파일 이름으로 드러난다.
4. `admin-list.ts`의 목록 디코드는 `decode/admin-projections.ts`로 모아 같은 필드 리더를 쓴다.
5. `TableCollectionId = Exclude<CollectionId, "ragDocuments">`를 정의하고
   `SUPABASE_COLLECTIONS: Record<TableCollectionId, SupabaseCollectionDescriptor>`로 Partial을 없앤다.
   `constants/collections.ts`에 `tableFor(collection: TableCollectionId): string` 하나만 노출하면 런타임
   throw 2개(`transport.ts:25`, `sort-rpc.ts:30`)와 폴백 7개가 타입으로 대체된다.
6. 서술자에 `listSelect`와 `orderColumns`를 추가해 `admin-list.ts:28`의 `listProjected`가 서술자에서 읽게
   하고, `SORT_RPC`도 서술자의 `sortRpc?: string` 필드로 흡수한다. 새 컬렉션 추가 시 고칠 곳이 서술자
   한 곳이 된다.

순수 함수라 테스트가 싸다. 테스트 편 TEST-03·TEST-04가 지적한 무테스트 파일 12개가 디코더 테스트
7~8개로 대체된다.

### `listCrud` 인터페이스가 `devArticles`에 맞지 않는다 (ARCH-D-06, 중간)

`dev-articles.ts:26-32`가 `listCrud(COLLECTIONS.DEV_ARTICLES, ...)`를 그대로 써서 `updateOrder`가 노출된다.
호출하면 `sort-rpc.ts:30`이 "정렬 RPC 가 없는 컬렉션입니다: devArticles"로 던진다. 블로그에는 수동 정렬이
없는데 팩토리가 그 연산을 인터페이스에 올려 둔 것이다. `devArticlesCrud.list`도 함정이다. 지금은
아무도 안 쓰지만(live 저장소는 `listDevArticleItemsAdmin`을 쓴다), 누가 부르면 서술자 select가
`...,data`라 모든 글의 Markdown 본문을 관리자 첫 화면으로 끌어온다.

`listCrud`를 두 계층으로 나눈다. `documentCrud(collection, toEntity, label, ragSourceType?, syncPolicy?)`가
`{newId, get, create, update, setPublished, remove}`를 돌려주고, `sortableListCrud(...)`가 거기에
`{list, updateOrder}`를 더한다. 후자의 인자 타입을 `SortableCollectionId`로 좁히면 런타임 throw 2개와
`list` 함정이 함께 사라진다.

### `mergeRow`가 서버 전송 모듈 안에 있다 (ARCH-D-04, 낮음)

`list-crud.ts:10`은 브라우저에서 도는 관리자 쓰기 경로인데, 행 병합 함수 하나를 쓰려고
`public/transport.ts`를 import한다. 그 모듈은 `constants/cache`, `paginate-all`, `retry-fetch`,
`supabase/config`와 `fetch(... next:{revalidate,tags})` 호출을 함께 들고 있다. 그래서 `transport.ts`에
`import "server-only"`를 걸 수 없다. `rag.ts:1`은 이미 걸려 있다.

`src/lib/supabase/row-merge.ts`를 새로 만들어 `mergeRow`, `toDate`, `toNullableDate`를 옮긴다. 서술자만
참조하는 순수 모듈이다. `transport.ts`는 거기서 re-export하지 말고 직접 import하고, 그 뒤 상단에
`import "server-only"`를 추가한다.

**이 작업이 ARCH-D-11의 선결 조건이다.** `transport.ts:65`와 `rag.ts:40`에 `baseHeaders`가 동일 구현으로
두 벌 있고, `apikey` 헤더 규약이 주석까지 복사돼 있다. 재시도 정책도 경로마다 제각각이라
`matchRagChunks`만 `fetchWithRetry`를 쓰고 `rag.ts:103,198,218`과 `transport.ts:208`은 맨 `fetch`다.
`src/lib/supabase/rest-client.ts`에 `restFetch(path, {params, accessToken?, retry?, cache})` 하나를 두어
헤더 조립과 재시도 여부를 인자로 만드는 게 답인데, `rag.ts`는 이미 `server-only`가 걸려 있으므로
`transport.ts`를 브라우저에서 떼어내지 않으면 통합 결과가 경계를 만들 수 없다.

### 그 밖의 데이터 계층 항목 (전부 낮음)

- **ARCH-D-09** 캐시 태그 `db:devArticles:{id}`를 무효화하는 쓰기가 저장소 어디에도 없다.
  `documentCacheTag`를 무효화하는 곳은 `site.ts:56`, `music.ts:174`, `dev.ts:102` 셋뿐이고 전부
  `COLLECTIONS.SITE`다. 현재 유일한 호출자(`handle-chat-request.ts:378`)가 항상 `fresh: true`를 넘겨
  캐시 분기를 타지 않아 실행되지 않을 뿐이다. `fetchRow`의 태그를 `collectionCacheTag`로 통일하고
  `documentCacheTag`를 site 문서 전용으로 좁히는 쪽이 단순하다.
  정정: 함께 지적된 "revalidate 리터럴 3벌"은 실제로 상수 1개(`constants/cache.ts:4`) + 라우트 리터럴
  2개(`app/[lang]/(public)/layout.tsx:23`, `app/api/search-index/route.ts:8`)다. 리터럴은 **2벌**이다.
- **ARCH-D-13** `storage-source-url.ts:27`의 `if (url.username || url.password || url.port) return false;`가
  포트 있는 URL을 전부 거부해서 로컬 Supabase 스택(`http://127.0.0.1:54321`)에서 관리자 이미지 프록시가
  전량 400을 낸다. `config.ts:10-11` 주석은 정반대로 "protocol·port 는 제한하지 않는다"고 적혀 있다.
  정정: 이건 문서화되지 않은 사고가 아니다. **같은 파일 `storage-source-url.ts:11-12`의 JSDoc이 포트
  거부를 명시적 의도로 기록**하고 있어서, 두 파일의 주석이 서로를 부정하는 상태다. `|| url.port`만
  지우면 JSDoc이 거짓이 된다. 코드와 양쪽 주석을 함께 고쳐야 하고, `storage-source-url.test.ts`에
  로컬 스택 origin 케이스를 추가한다. 프로덕션(`https://*.supabase.co`)은 포트가 비어 영향이 없다.
- **ARCH-D-12** `lib/ai/rag-query.ts:11`의 `keywordSimilarity`를 참조하는 프로덕션 코드가 0건이다.
  `rag-query.test.ts`만 8회 호출한다. 삭제하고 테스트를 `createKeywordScorer(query)(document)` 호출로
  바꾼다(같은 값을 검증한다).
- **ARCH-D-14** `lib/` 루트에 평면 파일 3개(`chat-screen-target-context.ts`, `contact-draft-storage.ts`,
  `photo-filter-query.ts`)가 있고, `constants → components/lib` 역방향 import가 3건이다
  (`navigation.ts:3`, `sections.ts:1`, `empty-configs.ts:1`). `photo-filter-query.ts`는
  `src/lib/photo/filter-query.ts`로, `contact-draft-storage.ts`는 `src/lib/contact/draft-storage.ts`로 옮긴다.
- **ARCH-D-16** `lib/content/rag-source.ts:1-31`이 Supabase fetcher를 직접 import하고
  `shouldUseMockContent()`를 거치지 않는다. 같은 폴더의 다른 getter는 전부 거친다. mock 모드에서 임베딩
  route를 직접 두드리면 `supabaseUrl()`이 빈 문자열이라 알아보기 어려운 오류가 난다. `getRagSourceData`
  진입부에서 mock 모드일 때 명시적 오류를 던지면 원인 추적이 짧아진다.

## 애플리케이션 계층

### `CustomCursor.tsx` 720줄, 단일 `useEffect`, 테스트 0 (ARCH-A-01, 높음)

`:91-660`의 `useEffect` 하나에 가변 지역 변수 45개와 내부 함수 30개가 들어 있고, 최소 다섯 가지 책임이
섞여 있다. 커서 기하와 그리기(`:274-396`), 미들클릭 자동 스크롤(`:195-242`), 로딩 표시 상태머신
(`:147-154`, `:546-569`), 타겟 스냅 해석(`:408-462`), 활성화 미디어쿼리(`:602-612`). 리스너 17개를 수동으로
등록·해제한다(`:614-658`).

인터페이스는 props 0개인데 구현이 720줄이다. 이건 depth가 아니라 은닉이다. 상태 전이가 effect 클로저의
지역 변수에 갇혀 있어 인터페이스로 관찰할 수 없고, `vitest.config.ts`의 coverage allowlist 밖이라 계측
대상도 아니다. 파일당 SRP 강선호의 최대 위반이다.

다만 지금 고장 나 있지는 않다. 시간 배분에서는 ARCH-A-03·A-05 뒤가 맞다.

분해 방향. `_lib/cursor-state.ts`의 `createCursorState(cursorEl, anchorEl)`이
`{setVisible, setPressed, setLoading, setSnapped, setMode, setAccent, measure, draw}`를 돌려준다(현 `:133-396`).
순수 DOM 조작이라 jsdom 단위 테스트가 가능하다. `_lib/auto-scroll-controller.ts`가 현 `:195-242, 493-531`을
받아 이미 테스트된 `auto-scroll.ts`의 소비자가 된다. `_lib/cursor-loading-registry.ts`가 로딩 id Set과
타이머 두 개를 갖고, `utils/custom-cursor-events.ts`와 짝이라 이벤트 계약이 한 파일에 모인다.
`_hooks/use-cursor-pointer-events.ts`가 리스너 등록·해제만 맡는다. `CustomCursor.tsx`는 ref 두 개와
위 네 개의 조립으로 60줄 이하가 된다.

### `handleChatRequest` 315줄 단일 함수 (ARCH-A-02, 중간)

`handle-chat-request.ts:372-687`의 async 함수 하나가 본문 크기 검사부터 SSE 스트림 분기까지 7단계를
순차 수행한다. 그중 `generateMessage`(`:513-629`)는 115줄짜리 중첩 클로저다. 의존성 주입 파라미터가 12개다.

소스 687줄에 테스트 1,163줄이다. 한 단계를 검증하려면 매번 전체 파이프라인을 세워야 한다는 증거다.
오류 코드 하나를 추가해도 이 함수를 열어야 한다.

이웃 파일들(`chat-schema.ts`, `chat-rate-limit.ts`)이 이미 있어 결이 맞다. `_lib/parse-chat-request-body.ts`가
`(request) => Result<ChatRequest, {status, code, lang}>`를, `_lib/enforce-chat-quota.ts`가 rate limit과
문자 예산 판정을, `_lib/chat-request-deadline.ts`가 abort/timeout 배선을 `{signal, timedOut, cleanup}`으로
돌려준다. `generateMessage` 클로저는 `_lib/generate-chat-message.ts`의 최상위 함수로 승격한다.
`handle-chat-request.ts`는 이 넷을 잇는 60줄 오케스트레이터로 남는다.

### `useLang()`이 리프까지 클라이언트화한다 (ARCH-A-04, 중간, 근거 정정)

**원 보고서의 "271개 중 235개(87%)가 `"use client"`"는 틀렸다.** 실측값은
`"use client"` 파일 **161개**, 비테스트 `.tsx` **273개**로 **59%**다. 전체 tsx(테스트 포함) 340개 기준으로도
47%다. 홑따옴표 `'use client'`는 0건이라 누락도 아니다. 87%는 근거를 찾을 수 없다.

**피해 사례로 든 `RevealWords.tsx`도 오귀속이다.** 파일 전체를 읽은 결과 `useLang`을 쓰지 않는다.
훅이 0개이고 props에서 JSX로 가는 순수 컴포넌트다. `"use client"`가 붙은 이유는 다른 데 있다.

확정된 부분은 남는다. `DevStackSection.tsx:1,28`은 `"use client"`의 유일한 이유가 `const { dict } = useLang()`
한 줄이고 나머지는 props에서 JSX다. `useLang` 소비 파일은 47개(테스트 제외)다. 방향도 타당하다.
`src/lib/i18n/get-dictionary.ts`에 `getDictionary(lang: Lang): UIDict`를 두고, 서버 컴포넌트가 그걸 읽어
필요한 문자열만 props로 내린다. `AboutView.tsx:3`이 `DICTIONARY`를 직접 import하는 패턴을 함수로
승격하는 것이다. `useLang()`은 언어를 바꾸는 곳(`LangMenu.tsx`)과 관리자 store 모드에만 남긴다.

다만 **우선순위가 잘못된 수치에 근거했으므로 중간으로 내린다.** 착수 전에 번들 절감 근거를 다시
세워야 한다. 실제로 몇 개 파일이 `useLang` 하나 때문에 클라이언트인지, 그 파일들이 번들에서 차지하는
비중이 얼마인지를 먼저 재고, 그 값이 작으면 이 항목은 하지 않는 게 맞다.

### `?photo=` 쓰기 경로 4벌, 그중 하나가 저장소가 스스로 금지한 패턴 (ARCH-A-06, 중간)

`MapView.tsx:46-49`가 `router.push(\`${pathname}?photo=${id}\`, {scroll:false})`를 쓴다. 기존 query를 통째로
버리는 유일한 구현이고(다른 3벌은 `URLSearchParams` 복사로 보존한다), 저장소 자신이 기록한 금지
패턴이기도 하다. `lib/navigation/replace-current-url.ts:3-5`가 "Next 16에서 정적 페이지 딥링크로 바로
진입한 경우 같은 pathname에 대한 router.replace가 no-op"이라고 적었고, `ArticlesView.tsx:46-47`이 같은
취지로 push를 피한다. 지도에서 사진을 열면 다른 query가 사라지고, 정적 진입 시 아예 열리지 않을 수 있다.

`use-photo-detail-session.ts`의 `goto`를 유일한 쓰기 경로로 삼고 `openPhoto(id)`를 export한다.
`MapView`와 `PhotoTile`이 이걸 호출한다. 쿼리 키도 상수화한다. `"photo"` 리터럴이 6곳에 있고
`"work"`·`"award"`·`"project"`는 상수 자체가 없으므로, `src/constants/routes.ts`에
`DETAIL_QUERY_KEYS = {photo:"photo", work:"work", award:"award", project:"project"}`를 둔다.

**이 작업이 ARCH-A-23의 일부를 함께 해소한다.** `PhotoTile.tsx`, `Chip.tsx`, `DevProjectCard.tsx` 세
파일은 `"use client"` 없이 클라이언트 API를 쓰고 있고(head로 확인, 셋 다 첫 줄이 `import`), 부모가
client라서 우연히 동작한다. 그중 `PhotoTile.tsx:52-67`의 `?photo=` URL 조작이 바로 A-06의 `openPhoto`
통합 대상이자 A-23이 말한 "`components/` 순수성 누수"의 실체다. 나머지 두 파일의 `"use client"` 명시는
별도로 붙인다.

### Escape 처리가 13곳에 흩어져 있고 4곳이 top-layer 조정에 불참 (ARCH-A-08, 중간)

**정정: 원 보고서는 9곳이라 했으나 실측 13곳이다.** 빠진 곳은 `dev-blog/_components/ArticleToc.tsx:107`,
`site-header/_components/SearchBox.tsx:58`, `custom-cursor/_components/CustomCursor.tsx:544`.

`src/hooks/use-overlay-layer.ts`가 top-layer 판정 시임을 이미 제공하고, 소비처가 6개 있다
(`ImageLightbox`, `Modal`, `ChatPanel`, `ArticleTocDrawer`, `PhotoModal`, 훅 자신). 그런데
`FilterBar.tsx:57`, `MobileMenu.tsx:68`, `DesktopMegaMenu.tsx:119`, `Select.tsx:53` 네 곳은 `isTopLayer`
게이트도 `stopImmediatePropagation`도 없이 `document` bubble에 직접 붙는다. 오버레이가 겹치면 ESC 한
번에 두 개가 닫힌다. 잘 만든 seam을 절반만 쓰고 있는 상태다.

`src/hooks/use-escape-key.ts`에 `useEscapeKey(active: boolean, onEscape: () => void, opts?: {capture?: boolean})`를
두고 내부에서 `useOverlayLayer`의 top-layer 판정과 `stopImmediatePropagation`을 강제한다. 13곳을 전부 교체한다.

### 앨범 상세만 모달 로딩 전략이 반대 (ARCH-A-09, 중간)

갤러리(`GalleryView.tsx:10-13`)와 지도는 `OnDemandPhotoModal`을 `next/dynamic`으로 지연 로드하고 투영본만
클라이언트로 보내는데, `AlbumDetailView.tsx:7`만 `PhotoModal`을 정적 import한다. 그리고
`albums/[id]/page.tsx:88-95`가 EXIF와 좌표를 포함한 전체 `Photo[]` + 전체 `Tag[]`를 직렬화한다.
앨범 상세의 초기 번들에 모달과 `ExifPanel`, `MiniMapCanvas`(maplibre)가 통째로 실리고, RSC payload에
쓰지 않는 EXIF가 전부 들어간다. 형제 화면 셋 중 하나만 반대 방향이다.

`AlbumDetailView`를 `OnDemandPhotoModal`로 교체하고, `albums/[id]/page.tsx`의 사진 해석을
`features/albums/_lib/to-album-gallery-photos.ts`로 옮겨 투영본만 내린다.

### 관리자 폼의 ko/en 필드쌍 30개소 복붙 (ARCH-A-19, 중간)

`label="…(한국어)"` 기준 15파일 30개소다. `ProjectForm.tsx` 6, `WorkForm.tsx` 5, `AdminGlobalEditor.tsx` 3,
나머지가 2개 이하씩. 매 개소가 `<div className={styles.grid2}>` + `AdminField`/`AdminInput` 두 쌍 +
스프레드 patch로 이뤄진 14줄 블록이고, `AwardForm.tsx:118-132`, `MediaForm.tsx:97-111`, `WorkForm.tsx:55-69`,
`AlbumForm.tsx:54-68`, `PhotoForm.tsx:81-95` 다섯은 필드명 치환만 빼면 동일하다.

이중언어가 이 저장소의 핵심 계약인데 그 계약이 30번 손으로 재작성돼 있다. 한 곳에서 `en`의 `required`를
잘못 걸면 나머지 29곳과 달라진다.

`src/components/LocalizedFieldPair.tsx`에
`{label, value: LocalizedText, onChange: (v: LocalizedText) => void, required?, multiline?, rows?}`를 받는
컴포넌트 하나(약 30줄)를 만든다. `AdminField`·`AdminInput`과 같은 프리미티브 등급이라 `components/`가
맞는 위치다. 절감 약 240줄. **효과 대비 위험이 가장 낮은 항목이고, 이 컴포넌트 하나에 테스트를 붙이면
30개소가 함께 검증된다.**

### 그 밖의 애플리케이션 계층 항목 (전부 낮음)

- **ARCH-A-10** `app/` 라우트에 도메인 투영이 남아 있다. `dev/articles/[slug]/page.tsx:117`(태그 조인, `lang`)과
  `:128`(같은 조인, `ko` 고정)이 O(n·m)을 두 번 돈다. `photo/albums/[id]/page.tsx:52-64`는 ko/en 설명
  문자열을 라우트에 하드코딩한다. `search/page.tsx:56-57`의 `?q` 배열 정규화도 라우트에 있다. 같은
  저장소가 이 일을 `_lib`에 빼는 방법을 이미 안다(`toAlbumCards`, `toDevProjectCards`, `resolve-album-cover.ts`).
  `article-projection.ts`에 `resolveArticleTagLabels`와 `resolveRelatedProjectCards`를 추가하고,
  `features/albums/_lib/album-page-copy.ts`와 `features/search/_lib/read-search-query.ts`를 만든다.
  콘텐츠가 소량이라 성능 통증은 없다.
- **ARCH-A-18** `moveItem` 복사. **정정: 3곳이 아니라 5곳이다.** 원본은
  `admin-dev-config/_lib/edit-dev-config.ts:60-67`, 글자까지 같은 복사본이
  `admin-global/_hooks/use-global-admin.ts:82-88`과 `admin-music-config/_hooks/use-music-config-admin.ts:93-99`
  (변수명이 `list`에서 `prev`로 바뀐 것만 다르다), 그리고 원 보고서가 빠뜨린 변형 2곳이
  `admin-dev-articles/_components/ArticleRelatedProjectsField.tsx:31`,
  `admin-dev-projects/_components/DevImageField.tsx:75`(`return list` 대신 `return`)다.
  `src/lib/collection/move-item.ts`로 승격하고 `edit-dev-config.ts`의 테스트를 함께 옮긴다.
- **ARCH-A-15** `features/legal/_lib/legal-documents.tsx`가 1,020줄이다(실측). 문서 3종 × 2언어 = 6벌의
  본문 JSX가 한 파일에 있다. ADR-0004·0006이 개인정보 처리방침 갱신을 배포 조건으로 걸고 있어 앞으로도
  계속 손댄다. `_lib/legal/privacy-ko.tsx` 식으로 6분할하고, `legal-documents.tsx`는
  `getLegalDocument(kind, lang)` 조회표 20줄만 남긴다.
- **ARCH-A-16** `components/PublicPageSkeletons.tsx`가 230줄에 `*Skeleton` export 7개를 담는다(실측).
  `components/`의 다른 45개 파일이 전부 "1파일 1컴포넌트 + 짝 CSS"인데 혼자 이탈했고, 사실상 barrel로
  동작해서 `search/loading.tsx`가 개발 스택 스켈레톤 상수까지 끌고 온다. `components/skeletons/` 폴더로
  파일당 하나씩 분리한다.
- **ARCH-A-13** `src/hooks/`는 "2개 이상 feature가 공유하는 hook만"인데 `use-chat-screen-target.ts`와
  `use-typing.ts`는 소비처가 각각 1곳이다(`ChatPanel.tsx:18`, `LandingView.tsx:12`, grep 전수).
  각각 `features/chat/_hooks/`와 `features/landing/_hooks/`로 옮긴다(테스트 동반).
- **ARCH-A-11** `features/monitoring/_components/AdminMonitoring.tsx`는 전체 31줄에 실질 로직 6줄이다.
  `startBrowserMonitoring("admin")`과 `stop`을 `useEffect`로 감싸고 `null`을 반환하는 게 전부다.
  지워도 복잡도가 어디에도 다시 나타나지 않는다. `features/admin-shell/`로 옮기고 폴더를 없앤다.
- **ARCH-A-12** `custom-cursor`와 `custom-scrollbar`가 import 없이 DOM 계약으로 결합돼 있어
  ESLint도 dependency-cruiser도 보지 못한다. `cursor-target.ts:18-19`가 스크롤바 소유 셀렉터를
  하드코딩하고, `CustomScrollbar.module.css:73`이 커서 소유 변수를 소비한다. 탈출구인
  `src/utils/custom-cursor-events.ts`는 그 폴더의 유일한 파일이고 CLAUDE.md 구조도에 항목 자체가 없다.
  두 feature와 이 파일을 `src/features/pointer-chrome/`으로 합치고 `_lib/pointer-chrome-contract.ts`에
  `DATA_CURSOR_SNAPPED`·`DATA_SCROLLBAR_UI`·`CURSOR_ACCENT_VAR` 상수와 계약 JSDoc을 둔다.
  `eslint.config.mjs`의 platform 패턴에 `pointer-chrome`을 추가한다.
- **ARCH-A-20** `eslint.config.mjs:56-58`의 `shared` 패턴에 `lib`이 없어서 `src/lib/**`가 어느 element
  type에도 매칭되지 않고 `default: "allow"`로 떨어진다. 존재하지 않는 폴더명 6개
  (`stores|api|services|schemas|providers|i18n|styles`)도 들어 있다. 현재 실제 위반은 0건이지만 게이트가
  없다. 패턴에 `lib|mocks`를 넣고 없는 폴더명을 뺀다. 자세한 건 규약 편 CONV-03을 같이 본다.
- **ARCH-A-24** 브레이크포인트 760/1100이 `PhotoGrid.tsx:23`, `PhotoTile.tsx:74`, `AlbumCard.tsx:45`에
  하드코딩돼 있다. `src/constants/breakpoints.ts`에 `PHOTO_GRID_BREAKPOINTS`를 두고 셋이 참조한다.
  `PhotoGrid`의 resize 리스너는 `PhotoModal.tsx:68-74`가 이미 쓰는 `useSyncExternalStore` + `matchMedia`
  방식으로 통일한다.
- **ARCH-A-28** `max-width: 1180px`를 가진 CSS 모듈이 **15개**다(원 보고서는 9개). `PageToolbar` 소비처는
  `ArticleCard`, `ArticlesView`, `GalleryView` 셋뿐이다. `src/components/PublicPageShell.tsx`
  (`<main>` + `PageToolbar`)를 만들거나, 더 가볍게는 `globals.css`에 `.u-page-main` 유틸을 둔다.
  화면마다 여백이 미묘하게 다를 수 있어 시각 회귀 확인이 필요하다.
- **ARCH-A-21** `features/about`은 이름이 전역인데 실제로는 사진 섹션 전용이고 소비처가 1곳이다.
  이름 변경 자체는 취향 판단이다. 다만 함께 지적된 첫 문장 분리 로직 3벌 복붙은 독립적으로 처리할 수
  있다. `AboutView.tsx:37-42`, `MusicAboutView.tsx:42-47`, `DevAboutView.tsx:53-58`이 전부
  `text.indexOf(". ")` 분리이고 주석이 복붙을 자백한다. `src/lib/text/split-lead.ts`로 승격한다.
- **ARCH-A-17** `features/sentry-triage`는 24파일 3,296줄인데 전부 `_lib/`이고 `_components/`·`_hooks/`가
  없다. UI가 없는 서버 파이프라인이 `features/`에 있는 셈이다. `src/lib/sentry-triage/`로 옮기면
  `lib/monitoring/`과 이웃이 된다. 다만 feature 정의를 서버 파이프라인 포함으로 넓히는 선택도 유효해서
  이동이 유일한 답은 아니다.

## 묶어야 하는 것

검증 과정에서 확인된 순서 의존이다. 개별 우선순위를 그대로 따르면 같은 파일을 여러 번 고친다.

- **ARCH-D-01 + ARCH-D-02 + ARCH-D-07은 한 작업의 부분이다.** 디코더 단일화, 서술자 단일 출처화,
  필드 리더 도입이 전부 같은 디코더 파일들을 건드린다. 따로 하면 같은 파일을 세 번 고친다.
- **BUG-C-06을 먼저 고쳐야 ARCH-A-07이 의미를 얻는다.** `use-query-modal.ts:22`의 `openedHere`가 boolean
  이라 외부 요인으로 닫혀도 리셋되지 않는 결함이 A-07이 제안하는 훅 통합의 근거 자체다. 순서를 반대로
  하면 통합 후에 같은 파일을 다시 연다.
- **ARCH-D-04가 ARCH-D-11의 선결 조건이다.** `transport.ts`를 브라우저 번들에서 떼어내지 않으면 REST
  클라이언트를 통합해도 `server-only` 경계를 세울 수 없다.
- **ARCH-A-06과 ARCH-A-23의 일부는 같은 수정으로 해소된다.** `PhotoTile.tsx:52-67`의 `?photo=` 조작이
  A-06의 `openPhoto` 통합 대상이면서 A-23이 말한 `components/` 순수성 누수의 실체다.
- **BUG-C-12와 ARCH-A-26은 같은 파일 작업이다.** 무-로케일 `/privacy`·`/terms`·`/accessibility`의 308
  누락을 고치는 일과 법적 문서 라우트 3개를 `[legalDoc]` 하나로 접는 일이 같은 파일들을 건드린다.

## 이론적 개선

여기 있는 항목은 사실 확인은 끝났지만 지금 깨지는 것이 없다. 착수 근거가 "앞으로 이런 일이 생기면"이라는
가정에 있어서, 그 가정이 실제로 생길 때까지 미루는 편이 낫다.

- **ARCH-D-05, 이미지 파생본 4파일 27함수. 삭제 테스트를 통과하지 못한다.** 사실 관계는 맞다. `storage.ts:123-170`에
  업로드·삭제 16개, `image-store.ts`에 타입 9멤버와 mock·live 구현, 경로 문자열 `photos/`·`music/`·`dev/`가
  3파일에 반복된다. `dev-blog`는 `AdminImageStore`에 아예 없고 별도 업로더를 쓴다. 제안된
  `imageFolder(scope, ownerId, variant)` 단일 출처와 `uploadImageVariant`/`deleteScopeImages` 2함수 축약도
  타당하다. **그러나 지금 깨지는 것이 없고 콘텐츠 종류를 추가할 계획도 없다.** 착수 근거가 "종류를
  하나 더 추가하면 6곳을 손으로 늘려야 한다"인데, 그 시점이 오면 그때 하는 편이 싸다.
- **ARCH-D-08 (`site_documents` 3종 코덱 중복).** `site/config`만 `merge_site_document` RPC 병합이고
  `music`·`dev`는 전체 upsert라는 사실은 확인됐다. 그 근거가 코드가 아니라 주석에만 있는 것도 맞다.
  다만 제안된 `writeMode` 통합은 RPC 시그니처 확인이 필요하고, 위험 근거인 "설정 편집기가 둘로 쪼개지면"
  이라는 전제가 지금 없다.
- **ARCH-D-15 (`buildRagChunks` 부분성).** 함수 이름은 전체 청크를 만들 것처럼 보이지만 실제로는
  `devArticles`를 쓰지 않는다. 분리 이유(Markdown 파서가 feature 안에 있어 `lib → features` 역방향 금지)는
  타당하고 `route.ts:37-38` 주석이 이미 설명한다. 조립 지점도 하나뿐이다. 위험은 "새 호출자가 생기면"에만 있다.
- **ARCH-D-17 (`cache()` 미적용).** `content/dev-articles.ts`에만 `cache()`가 걸려 있고 나머지 getter에는
  없다. `getTags`가 함수 내부 동적 import를 쓰는 이유가 순환 회피가 아니라는 점도 확인했다
  (`content/site.ts`의 import 목록에 `content/photo`가 없다). 다만 live 경로는 Next의 fetch 메모이제이션이
  받쳐 주므로 실효 이득이 mock 모드에 한정된다.
- **ARCH-A-25 (검색이 두 feature로 쪼개짐).** 입력은 `site-header`에, 결과와 인덱스는 `search`에 있다.
  배치가 갈린 것은 사실이다. 그런데 "두 화면의 매칭 규칙이 어긋나도 모른다"는 우려는 실제 불일치가
  관찰되지 않은 가정이다.
- **ARCH-A-27 (on-demand 로딩 2층위).** `use-on-demand-photo-details.ts`는 훅으로 뺐고
  `OnDemandDevProjectDetail.tsx:100-175`는 컴포넌트에 인라인이다. 구조 유사성은 확인됐지만 소비처가
  2곳뿐이라 추상화 이득이 크지 않다.

## 판단이 갈린 것

### `constants/dictionary.ts` 640줄 분할 (ARCH-A-22, 보류)

**두 하위 에이전트가 같은 파일에 대해 정면으로 반대되는 결론을 냈고, 상위 검수관이 판단을 유보했다.**

애플리케이션 계층 보고서(ARCH-A-22)는 SRP 위반으로 보고 `constants/dictionary/` 아래
`shell.ts`·`photo.ts`·`music.ts`·`dev.ts`·`chat.ts`·`contact.ts`·`a11y.ts` 7파일 분할을 제안했다. 근거는
음악 라벨 하나를 추가하려면 전역 타입을 건드려야 하고 그 변경이 소비 파일 전부의 타입 검사에 걸린다는
것이다.

데이터 계층 보고서는 같은 파일을 「확인했으나 문제 없던 항목」에 넣었다. "UI 문자열 사전이라는 단일
책임이 유지되고, 콘텐츠(`{ko,en}` + `pickText`)와 경계가 분명하며, 분할 이득이 크지 않다"가 그 판정이다.

검수관이 확인한 사실은 640줄, 섹션 구분 주석 10개, `useLang` 기준 소비 47파일이다. 어느 쪽 주장도
코드로 반증되지 않는다. 판단 근거는 이렇게 정리된다.

- 분할을 지지하는 쪽: 파일당 SRP가 사용자 강선호이고, ARCH-A-04(서버 컴포넌트화)를 진행하면 섹션별
  lazy 접근이 열려 분할이 실제 값을 얻는다.
- 유지를 지지하는 쪽: 사전은 단일 출처가 목적이다. 7개로 쪼개면 "이 문자열이 어느 파일에 있나"라는
  질문이 새로 생기고, 합치는 파일이 어차피 전체를 import하므로 번들 관점의 이득은 lazy 접근을 실제로
  구현하기 전까지 0이다. 이 저장소의 다른 곳에서는 오히려 단일 출처가 잘 지켜지고 있다는 점도
  이쪽 근거다.

**통합 검증관은 유지 쪽이었다.** 사전은 단일 출처가 목적이므로 그대로 두는 것이 맞다는 판정이다.

한 가지는 분명하다. ARCH-A-04의 번들 근거가 다시 서고 서버 컴포넌트화를 실제로 하기로 결정하기 전에는
이 항목에 착수하지 않는다. A-04의 87%가 틀린 수치였으므로 지금은 그 결정의 전제부터 없는 상태다.
