# 개발 블로그 개편 계획

> 상태: **B1–B7 구현 및 WebMCP Tool Inspector 평가 완료**
> 작성일: 2026-08-11
> 관련 계획: [통합 포트폴리오 v2](00-plan-v2.md), [챗봇](01-profile-chatbot.md), [WebMCP](04-webmcp-agent-tools.md), [화면 문맥 챗봇](06-chat-screen-context.md)
> 목적: 개발 섹션의 소개·경력·기술 구조를 정리하고, 관리자가 Markdown으로 작성한 한국어 블로그를 공개 검색·프로젝트·챗봇·WebMCP와 연결한다.

## 1. 확정한 범위

개발 메뉴는 다음 순서로 바꾼다.

1. 소개
2. 경력·기술
3. 프로젝트
4. 블로그

| 공개 경로              | 역할                                 |
| ---------------------- | ------------------------------------ |
| `/dev`                 | 개발 소개                            |
| `/dev/career`          | 경력·수상·기술 스택                  |
| `/dev/projects`        | 프로젝트 목록과 기존 상세 모달       |
| `/dev/articles`        | 발행일순 블로그 카드 목록            |
| `/dev/articles/[slug]` | 독립된 블로그 상세 페이지            |
| `/dev/about`           | 같은 언어의 `/dev`로 영구 리다이렉트 |

공개 라벨은 한국어 `블로그`, 영어 `Blog`로 쓴다. 내부 타입과 컬렉션 이름은 일반적인 콘텐츠 모델을 드러내도록 `DevArticle`, `devArticles`를 사용한다.

블로그 상세는 모달로 만들지 않는다. 긴 본문, 목차, 코드, 영상, 번역, 공유 URL, 검색 노출과 스크롤 복원은 독립 페이지가 더 안정적이다. 프로젝트는 기존 모달을 유지한다.

## 2. 콘텐츠 모델

```ts
type DevArticle = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  body: string;
  cover?: ImageMeta;
  coverAlt?: LocalizedText;
  tags: string[];
  relatedProjectIds: string[];
  published: boolean;
  publishedAt?: Date;
  firstPublishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type DevArticleTag = {
  id: string;
  ko: string;
  en: string;
};
```

- 제목, 요약과 대표 이미지 설명은 기존 콘텐츠처럼 `LocalizedText`로 한국어·영어 값을 저장하고 현재 언어에서 `pickText`로 선택한다. slug, 날짜와 관계 ID처럼 번역 대상이 아닌 값은 단일 필드로 유지한다.
- 본문만 한국어 Markdown 원문 하나로 저장한다. Markdown 전체를 필드별 번역하거나 `LocalizedText`로 이중 저장하지 않는다.
- `publishedAt`은 관리자가 직접 지정한다. 초안에서는 비어 있을 수 있으며 발행할 때 필수다. 이전 글을 옮길 때 실제 작성일을 보존하고 목록과 탐색 목록의 기준으로 사용한다.
- `firstPublishedAt`은 시스템이 최초 발행 성공 시 한 번만 기록한다. 발행을 취소해도 지우지 않으며 이 값이 있으면 UI와 저장 함수 모두 slug 변경을 거부한다.
- `createdAt`과 `updatedAt`은 시스템 기록이며 공개 정렬에 사용하지 않는다.
- 예상 읽기 시간과 목차는 Markdown에서 계산한다. 파생값을 Firestore의 별도 원본으로 중복 저장하지 않는다.
- 대표 이미지가 없으면 개발 섹션의 기존 타이포그래피와 색 토큰에 맞춘 타이포그래피 중심 대체 디자인을 사용한다.
- 대표 이미지가 있으면 `coverAlt`에 이미지 자체를 설명하는 대체 텍스트를 요구한다. 제목을 반복 입력하지 않으며 목록 카드와 상세 hero가 같은 값을 사용한다.
- `slug`는 영어 제목을 우선하고 없으면 한국어 제목을 사용해 영문·숫자·하이픈 형태로 자동 제안하되 관리자가 첫 발행 전까지 수정할 수 있다. 저장할 때 정규화하고 중복을 거부한다. 첫 발행 이후에는 URL 보존을 위해 변경할 수 없다.
- 연관 프로젝트는 `relatedProjectIds`에 순서대로 저장한다. 프로젝트 문서에 글 ID를 중복 저장하지 않는다.
- `tags`에는 자유 입력 문자열이 아니라 `DevArticleTag.id`를 저장한다. 개발 글의 주제·기술 태그는 사진의 촬영 주제인 `site/config.tags`와 수명과 의미가 다르므로 사진 태그 사전을 공유하지 않고 별도 통제 사전으로 관리한다.
- `DevArticleTag`는 기존 `Tag`와 같은 `id/ko/en` 표시 계약을 사용하되 별도 블로그 태그 사전에 저장한다. `React`, `Next.js`처럼 번역할 필요가 없는 기술명은 두 언어에 같은 값을 넣을 수 있다. id는 저장 후 안정적으로 유지하고, 라벨 변경은 허용하되 이미 사용 중인 태그 삭제는 사용 글 수와 영향을 확인한 뒤에만 허용한다.
- 태그 저장 위치는 Firebase 전환 전에 확정한다. 독립적인 생성·수정·삭제와 사용 글 수 검증이 필요하므로 기본안은 별도 `devArticleTags` 컬렉션이며, 이를 채택하면 collection 상수, 관리자 전용 write Rules, 공개 getter/Rules 테스트의 허용 컬렉션 목록과 cache tag를 함께 추가한다. 단일 config 문서로 바꿀 경우에는 동시 수정과 부분 갱신 비용이 더 낫다는 근거를 B5 시작 전에 남긴다.

### Mock 우선 개발 원칙

별도 개발용 Firebase 프로젝트나 개발 DB를 만들지 않는다. 데이터 계약과 화면이 안정되기 전까지 `mocks/dev-articles.ts`의 대표 글로 공개 목록·상세·관리자 폼·Markdown renderer·관계 표시를 개발한다. mock에는 다음 경우를 모두 넣는다.

- 대표 이미지 있는 글과 없는 글
- 긴 목차, 같은 이름의 heading과 표가 있는 글
- JavaScript, TypeScript, Java, C, C++, Python 코드 블록
- 본문 중간 이미지 여러 장과 YouTube 영상
- 연관 프로젝트가 여러 개인 글과 없는 글
- 발행일이 같은 글, 초안과 발행 글

콘텐츠 접근은 처음부터 repository/getter 경계 뒤에 둔다. 공개 화면은 mock과 Firestore 중 어느 쪽인지 알지 못해야 한다. 관리자 폼도 저장 함수와 이미지 uploader를 주입받아 mock 단계에서는 브라우저 로컬 초안과 fixture URL로 작성 흐름을 검증한다. 이 로컬 초안은 개발 편의를 위한 것이며 운영 데이터나 실제 CMS 저장소로 취급하지 않는다.

**mock 단계에서 관리자 저장은 공개 화면에 반영되지 않는다.** 관리자 저장소는 브라우저 localStorage이고 공개 페이지는 서버에서 `mocks/dev-articles.ts`를 읽는다. 서버가 브라우저 저장소를 읽을 수 없으므로 둘을 잇지 않고, 로컬 저장소를 mock 글로 seed해 같은 글에서 출발하게만 한다. 두 쪽은 B5에서 Firestore로 하나가 된다.

mock 단계에서는 Firebase 컬렉션, Rules, index와 Storage 경로를 만들거나 배포하지 않는다. 다음 조건을 만족한 뒤 한 번에 Firebase adapter를 연결한다.

- 콘텐츠 타입과 Markdown 계약이 확정됐다.
- 공개 목록·상세와 관리자 편집/미리보기가 mock E2E를 통과한다.
- slug, 발행일 정렬, pagination과 프로젝트 관계 규칙이 테스트로 고정됐다.
- 실제 Storage에서만 확인할 이미지 업로드 항목이 분리돼 있다.

전환 시 Firestore에 `devArticles` 컬렉션을 추가한다. 공개 읽기는 `published == true`, 쓰기는 관리자만 허용한다. 블로그는 기존 `order asc` 콘텐츠와 달리 `publishedAt desc`, `id asc`가 정렬의 원천이며 관리자 드래그 순서를 두지 않는다. 기존 `publishedOrderedQuery`를 억지로 재사용하지 않고 Firestore REST transport에 다중 order direction과 document id 보조 정렬을 표현할 수 있는 범용 query builder를 추가한다. Firestore가 생략된 document name 정렬을 마지막 field 방향으로 암묵 적용하지 않도록 query의 `__name__ ASCENDING`과 index의 `__name__ ASCENDING`을 모두 명시적으로 표현해야 한다. 이 builder는 기존 `order asc` 호출을 그대로 지원해야 한다.

초기 규모에서는 공개된 article projection을 발행일순으로 가져온 뒤 서버에서 태그를 필터링하고 8개 단위로 나눈다. 따라서 첫 구현에는 `tags array-contains` 쿼리를 사용하지 않는다. 글 수가 projection 전체 조회를 부담스럽게 만드는 임계치를 운영 지표로 확인한 뒤에만 서버 쿼리 pagination으로 전환하고, 그때 `published + tags array-contains + publishedAt desc + id asc` 복합 인덱스를 추가한다. 최초 배포에는 최소한 `published + publishedAt desc + id asc` 복합 인덱스를 추가한다. Rules와 index를 emulator에서 먼저 검증하고 배포한 다음 CMS adapter와 Storage 업로드를 연결한다. mock getter는 이후에도 자동화 테스트와 외부 API 없는 로컬 개발용으로 유지한다.

## 3. Markdown 계약

관리자 편집기는 `편집`과 `미리보기`를 토글한다. 넓은 화면에서도 두 패널을 항상 동시에 렌더하지 않아 입력 영역을 충분히 확보하고, 공개 페이지와 같은 renderer를 미리보기에도 사용한다.

지원 범위:

- 제목, 문단, 강조, 목록, 인용문, 링크, 구분선
- 표와 fenced code block
- 본문 이미지와 대체 텍스트
- YouTube 영상
- 자동 목차
- JavaScript, TypeScript, Java, C, C++, Python을 포함한 주요 언어의 코드 syntax highlighting

코드 하이라이팅은 서버에서 처리해 클라이언트에 전체 언어 문법 번들을 보내지 않는다. 지원 언어 별칭(`js`, `javascript`, `ts`, `typescript`, `java`, `c`, `cpp`, `python`, `py` 등)을 한곳에서 정규화하고, 알 수 없는 언어는 일반 코드 블록으로 안전하게 표시한다. 다크·라이트 테마 모두 현재 색 토큰과 대비 기준을 따른다.

임의 HTML, MDX, JSX와 실행 가능한 스크립트는 허용하지 않는다. Markdown을 HTML로 바꾸는 단계에서 허용 요소와 속성을 제한하고 다음 항목을 별도로 검증한다.

- 링크 프로토콜은 `https`, `mailto`와 내부 경로만 허용한다. `http`는 넣지 않는다 — 사이트의 다른 공개 링크가 이미 `lib/security/public-url.ts`에서 HTTPS만 통과시키고 있어 같은 판정을 재사용하며, 전역 CSP의 `upgrade-insecure-requests`가 어차피 HTTPS로 올린다. 정책을 두 벌 두면 한쪽만 느슨해진다.
- 외부 링크에는 안전한 `rel` 값을 붙인다.
- 이미지는 관리자가 업로드한 Storage URL과 명시적으로 허용한 이미지 출처만 사용한다. 허용 호스트는 CSP `img-src`와 같은 상수(`constants/security-headers.ts`의 `STORAGE_IMAGE_HOSTS`)를 본다.
- YouTube는 영상 ID를 추출할 수 있는 `youtube.com`과 `youtu.be` URL만 iframe으로 바꾼다. 임의 iframe은 제거한다.
- 제목 id는 renderer가 생성하며 중복 제목에도 안정적인 고유 id를 부여한다.

관리자 편집기 옆에는 접을 수 있는 `Markdown 도움말`을 둔다. 지원 문법, 코드 언어 별칭, 이미지 대체 텍스트와 다음 전용 문법을 복사 가능한 예시로 보여준다.

```md
![관리자 화면의 블로그 편집기](https://허용된-이미지-주소)
::caption[블로그 편집 화면]

::youtube[https://www.youtube.com/watch?v=VIDEO_ID]{title="영상 제목" source="YouTube"}
```

caption은 바로 앞 이미지에만 연결한다. YouTube의 `title`은 facade와 iframe의 accessible name에 쓰는 필수값이고 `source`는 선택값이다. 잘못된 directive, 허용되지 않은 URL이나 대체 텍스트가 없는 이미지, 제목이 없는 YouTube는 미리보기에서 원문 위치와 오류를 보여주고 발행을 막는다. 초안 저장은 허용해 작성 중인 내용을 잃지 않게 한다.

### 목차와 예상 읽기 시간

목차는 `h2`와 `h3`만 사용한다. heading의 평문을 소문자 slug로 바꾸고 같은 id가 생기면 문서 순서대로 `-2`, `-3` suffix를 붙인다. 목차, 본문 heading과 URL fragment는 같은 parser 결과를 사용한다.

[Confluence](https://support.atlassian.com/confluence-cloud/docs/view-insights-on-pages/)는 페이지와 블로그에 예상 읽기 시간을 표시하지만 계산식은 공개하지 않는다. 이 프로젝트는 계산 기준을 공개한 [Medium](https://help.medium.com/hc/en-us/articles/214991667-Read-time)의 한중일 500자/분·그 밖의 언어 265단어/분을 본문 기준으로 사용하고, 개발 글의 코드 읽기 시간을 별도로 더한다.

```text
분 = CJK 문자 수 / 500
   + 비 CJK 단어 수 / 265
   + fenced code block의 비어 있지 않은 줄 수 / 20
```

Markdown 표식, URL, caption directive와 코드 fence 표식은 세지 않는다. 이미지와 YouTube는 실제 감상 시간이 방문자마다 크게 달라 별도 시간을 더하지 않는다. 결과는 올림하고 최소 1분으로 표시한다. 계산은 renderer가 만든 AST를 받는 단일 순수 함수에서 수행하며 목록, 상세, 관리자 미리보기와 테스트가 같은 값을 사용한다.

## 4. 이미지와 영상 작성 흐름

본문 이미지 버튼을 누르면 기존 관리자 이미지 업로드 흐름을 재사용해 WebP로 변환하고 `dev-blog/{articleId}/` 아래에 저장한다. 새 글 화면에 진입할 때 클라이언트에서 article ID를 먼저 생성하고 첫 Firestore 저장에도 같은 ID를 사용한다. Storage 업로드가 끝나면 현재 커서 위치에 대체 텍스트를 포함한 Markdown 문법을 삽입한다. Firestore 문서 쓰기는 여전히 명시적인 `저장` 때만 발생한다. 대표 이미지는 같은 글의 자산 중에서 지정하거나 별도로 업로드할 수 있다.

이미지에는 대체 텍스트 입력을 요구한다. 캡션이 필요하면 이미지 바로 다음 줄의 제한된 전용 문법으로 표현하고 공개 renderer와 미리보기가 같은 결과를 내게 한다.

YouTube 삽입 대화상자는 URL과 영상 제목, 선택적 출처를 받아 제한된 전용 문법을 삽입한다. 외부 metadata API로 제목을 자동 조회하지 않는다. 공개 렌더링은 기존 `/music/media`와 같은 facade를 사용한다. `i.ytimg.com` 썸네일 위에 제목·출처·재생 버튼을 표시하고, 방문자가 누른 항목만 `youtube.com/embed/{id}?autoplay=1` iframe으로 교체한다. 가능하면 현재 `MusicMediaView`의 동작을 공용 `YouTubeFacade`로 추출해 블로그와 음악이 같은 접근성·CSP·외부 요청 정책을 사용하게 한다.

글 삭제 시 해당 폴더를 정리한다. 본문에서 이미지를 지우거나 이미지 업로드 뒤 글을 저장하지 않고 나간 경우 Storage 파일을 즉시 삭제하지 않고 고아 이미지 후보로 남긴다. `/admin/maintenance`에서 모든 초안·발행 글의 cover와 Markdown 이미지 URL을 기준으로 참조 여부를 다시 계산해 정리한다.

관리 화면에는 `블로그 고아 이미지` 패널을 추가한다.

1. `dev-blog/`의 파일 목록과 관리자 권한으로 읽은 모든 `devArticles`의 참조 URL을 비교한다.
2. 어떤 cover와 본문에서도 참조하지 않고 업로드 후 24시간이 지난 파일만 후보로 표시한다.
3. 기본 동작은 dry run이며 파일 경로, 크기, 업로드 시각과 예상 절감 용량을 보여준다.
4. 관리자가 확인한 뒤에만 삭제한다. 실행 직전에 참조를 다시 읽어 새로 사용된 파일을 제외한다.
5. 개별 실패는 나머지 삭제를 막지 않고 성공·실패 경로를 결과에 남긴다.

Firestore 문서 삭제와 해당 글 폴더 정리는 기존 CRUD에서 먼저 시도하되, 실패한 파일도 이 패널에서 다시 찾을 수 있게 한다. 참조된 이미지는 오래됐다는 이유만으로 삭제하지 않는다.

## 5. 관리자 CMS

`/admin/dev`에 `블로그` 카드를 추가하고 다음 화면을 둔다.

| 관리자 경로                        | 역할                                           |
| ---------------------------------- | ---------------------------------------------- |
| `/admin/dev/articles`              | 초안·발행 글 목록, 검색과 발행일순 정렬        |
| `/admin/dev/articles/new`          | 새 글 작성                                     |
| `/admin/dev/articles/[id]`         | 글 편집                                        |
| `/admin/dev/articles/[id]/preview` | 실제 공개 레이아웃을 쓰는 관리자 전용 미리보기 |

편집 폼에는 한국어·영어 제목과 요약, slug 자동 생성·수정, 대표 이미지와 한국어·영어 대체 텍스트, 태그, 발행일, 연관 프로젝트, 한국어 Markdown 본문, 발행 상태를 둔다. 본문 입력부에는 한국어 원문임을 명확히 표시한다. 발행일은 날짜와 시간을 직접 입력하며 최초 발행 시 자동으로 덮어쓰지 않는다. 태그는 통제 사전에서 여러 개를 선택하고, 필요한 태그가 없으면 관리자 권한 안에서 한국어·영어 라벨을 입력해 새 태그를 추가할 수 있게 한다. 태그 생성 시 id 중복과 공백뿐인 라벨을 거부하고, 저장된 글에는 태그 라벨이 아니라 안정적인 id 배열을 기록한다.

관리자 목록은 기존 `useOrderedAdmin`의 drag reorder를 사용하지 않는다. 발행 상태, 발행일 내림차순과 검색을 지원하는 블로그 전용 목록 state/hook을 만들고 동일 발행일에는 id 오름차순을 적용한다. 초안에는 `publishedAt`이 없어 이 축에 자리가 없으므로 발행 글보다 위에 두고 수정일 내림차순으로 정렬한다 — 방금 만든 초안이 목록 맨 아래로 가라앉지 않게 하려는 것이다. 이 규칙은 Firestore 쿼리로 표현할 수 없어 B5 이후에도 화면 쪽 순수 함수로 남는다. 목록 REST 응답은 `admin-list-rest.ts`의 projection 패턴을 따라 제목·상태·발행일·수정일·slug·태그처럼 행에 필요한 필드만 반환하고 큰 Markdown `body`와 원본 이미지 metadata는 제외한다. 본문은 편집 화면에 진입해 문서 한 건을 읽을 때만 가져온다.

미리보기 경로는 관리자 인증 안에서만 접근하고 sitemap, 검색 인덱스, RAG와 WebMCP에는 노출하지 않는다. live에서는 마지막으로 Firestore에 저장한 초안을 서버가 읽어 공개 상세와 같은 컴포넌트로 렌더링한다. mock 단계에는 서버가 브라우저 저장소를 직접 읽을 수 없으므로 미리보기 shell이 로컬 article repository의 저장본을 읽어 인증된 preview handler로 보내고 같은 renderer 결과를 표시한다. 저장하지 않은 변경이 있으면 전체 페이지 미리보기 전에 저장 안내를 표시한다.

편집기 토글 미리보기는 현재 브라우저의 저장 전 값을 인증된 preview Route Handler 또는 Server Action에 보내 서버 Markdown renderer로 처리한다. 미리보기 탭을 열거나 열린 상태에서 입력이 멈췄을 때만 debounce해 요청하며 결과를 저장하지 않는다. 공개 상세와 전체 페이지 미리보기는 같은 renderer를 서버에서 직접 호출한다. 따라서 syntax highlighter와 sanitizer의 서버 전용 구현을 클라이언트 번들에 복제하지 않는다.

입력 후 5초 동안 변경이 없으면 본문과 폼 값을 브라우저 로컬 복구본에 자동 저장한다. Firestore 쓰기는 관리자가 `저장`을 눌렀을 때만 수행한다. 저장 중에는 중복 제출과 발행을 막고, 성공하면 해당 로컬 복구본을 삭제한다. 변경된 내용을 저장하지 않고 이동하거나 탭을 닫으려 하면 경고한다. 로컬 복구본에는 이미지 바이너리를 넣지 않고 Storage URL 또는 mock fixture URL만 저장한다.

발행 시 다음 조건을 검사한다.

- 한국어·영어 제목과 요약, slug, 한국어 본문과 발행일이 있다.
- slug가 유효하고 다른 글과 겹치지 않는다.
- 대표 이미지와 본문 이미지에 대체 텍스트가 있다.
- YouTube URL과 연관 프로젝트 ID가 공개 가능한 값이다.
- Markdown이 허용된 출력으로 렌더링된다.

## 6. 공개 목록과 상세 디자인

### 블로그 목록

사진 작업 목록의 상단 구조를 기준으로 `제목 / 현재 결과 수 / 보기 전환` toolbar와 그 아래 가로 스크롤 가능한 태그 칩 행을 둔다. 태그는 `전체` 또는 하나의 태그를 선택하는 단일 선택 방식이며 선택값을 `?tag={tagId}`에 기록한다. 존재하지 않거나 삭제된 태그 id는 `전체`로 정규화한다. 태그를 바꾸면 현재 페이지는 1로 돌아가며 보기 방식은 유지한다.

보기 전환은 `그리드 보기 / 목록 보기` 두 가지다. 선택값은 `?view=grid|list`에 기록해 공유 URL, 새로고침과 뒤로가기에서 보존하고, 값이 없거나 잘못되면 `grid`를 기본값으로 사용한다. 그리드 보기는 데스크톱 2열 카드, 모바일 1열 카드이며 대표 이미지, 제목, 요약, 태그, 발행일과 예상 읽기 시간을 표시한다. 목록 보기는 한 행에 제목, 요약 또는 짧은 발췌, 태그, 발행일과 예상 읽기 시간을 배치하고 작은 화면에서는 제목 아래 metadata를 줄바꿈한다. 대표 이미지가 없으면 그리드에서는 개발 섹션의 기존 타이포그래피와 색 토큰에 맞춘 블로그 전용 대체 구성을 사용하며, 목록에서는 레이아웃이 비지 않도록 이미지 칸 자체를 생략한다.

공용화 경계는 사진 화면을 복제하지 않고 다음처럼 잡는다.

- 현재 전역 `ViewToggle`의 `square`, `masonryLabel`, `squareLabel`처럼 사진 용어에 묶인 API를 두 선택지의 id·label·icon을 받는 범용 segmented view toggle로 확장한다. 사진은 기존 `masonry/square`, 블로그는 `grid/list` 설정을 주입하며 `aria-pressed`와 키보드 동작을 공유한다.
- 사진 `FilterBar`에서 `Chip`을 나열하는 태그 행과 overflow 스타일만 공용 `TagFilterBar`로 승격한다. 카메라·초점거리 popover와 사진 필터 상태는 기존 `FilterBar`에 남기고, 블로그는 공용 태그 행만 사용한다.
- 제목·결과 수·보기 전환의 배치와 최대 폭은 공용 page toolbar shell로 승격할 수 있으면 사용하되, 사진의 무한 스크롤·모달·검색 상태와 블로그의 pagination 상태를 하나의 뷰 컴포넌트로 합치지 않는다.
- `DevProjectsView.module.css`의 카드·그리드·모달 스타일과 `/dev-project-image` fallback 구현을 블로그 사용만을 위해 선행 분리하지 않는다. 블로그 카드와 기존 프로젝트 카드의 실제 markup·토큰이 충분히 겹친다는 것이 구현 중 확인될 때만 작은 card surface primitive를 추출한다.
- 대표 이미지가 없는 목록 카드와 개발 섹션 OG 이미지는 책임을 분리한다. 목록 fallback은 가벼운 CSS·실제 텍스트로 만들고, OG metadata는 같은 개발 섹션의 기존 `/dev-project-image` 생성 경로를 article 입력도 받을 수 있게 범용화해 재사용한다. 두 화면에 light/dark OG 이미지를 동시에 렌더하는 프로젝트 카드 방식은 블로그 목록에 복제하지 않는다.

태그 필터를 적용한 결과를 `publishedAt desc`, `id asc`로 정렬하고 보기 방식과 관계없이 한 페이지에 8개씩 표시한다. 페이지 번호는 `?page=` query에 남겨 새로고침과 뒤로가기가 동작하게 한다. 빈 필터 결과에는 선택 태그와 초기화 동작을 보여준다. 범위를 벗어나거나 숫자가 아닌 페이지는 같은 `tag`와 `view`를 보존한 1페이지 canonical URL로 정규화한다. URL query 직렬화는 `tag`, `view`, `page`만 허용하며 기본값은 생략한다.

### 블로그 상세

상세 상단은 앨범 상세의 full-bleed hero 구성을 기준으로 한다. 대표 이미지를 배경으로 채우고 하단 scrim 위에 제목, 요약, 발행일·수정일·예상 읽기 시간과 태그를 표시한다. 좌상단에는 같은 언어의 블로그 목록으로 돌아가는 링크, 우상단에는 기존 `ShareButton`을 둔다. 공유 제목은 글 제목, URL은 canonical 상세 URL을 사용한다. 앨범의 hero shell·scrim·back/share 위치·진입 motion을 공용 hero primitive로 승격할 수 있으면 재사용하되, 앨범/블로그 metadata 내용은 slot으로 주입한다.

대표 이미지가 없는 글도 같은 정보 위계를 유지하되 빈 이미지 영역을 만들지 않는다. 전역 색 토큰을 사용한 타이포그래피형 hero를 렌더하고 scrim은 생략하며, 뒤로가기·공유 버튼은 해당 배경에서 WCAG 대비를 만족하는 일반 surface 스타일로 전환한다. 대표 이미지의 초점 위치가 필요해질 수 있으므로 `cover`의 기존 `ImageMeta`가 focal position을 지원하는지 구현 전에 확인하고, 지원하면 앨범과 같은 `object-position` 계약을 사용한다.

hero 다음에는 긴 글에 맞춘 본문 최대 폭을 배치한다. hero의 텍스트가 이미지에 포함된 것으로 취급되지 않도록 실제 HTML 텍스트로 유지하고, 대표 이미지 alt는 제목을 기계적으로 반복하지 말고 관리자가 입력한 `coverAlt`를 사용한다.

#### 노션식 floating 목차

목차는 본문 옆에 항상 펼쳐진 열이나 상단 고정 bar로 만들지 않고, Notion의 page-level table of contents처럼 화면 오른쪽 가장자리에 붙는 축소 인디케이터를 기본 상태로 사용한다. 본문 흐름과 너비를 침범하지 않으면서 스크롤 중 어느 위치에서도 접근할 수 있어야 한다.

- Markdown parser가 만든 동일한 heading 결과 중 `h2`, `h3`만 문서 순서대로 사용한다. `h3`는 바로 앞 `h2` 아래에 들여쓴 계층으로 표현하고, 목차·본문 heading·URL fragment가 같은 id를 사용한다.
- heading이 2개 미만이면 floating 목차를 렌더링하지 않는다. hero를 지나 본문 영역에 진입하면 나타나고, 본문 아래의 연관 프로젝트 영역에 도달하면 사라져 하단 콘텐츠를 가리지 않는다.
- 축소 상태는 화면 오른쪽 중앙에 세로로 나열한 짧은 가로선으로 표시한다. 각 선은 heading 하나에 대응하고 `h3` 선은 `h2`보다 짧게 보여 계층을 암시한다. 현재 heading의 선은 길이·굵기·색 대비로 강조하되 색상만으로 상태를 전달하지 않는다.
- 데스크톱에서는 인디케이터에 pointer hover가 들어오거나 내부 컨트롤이 keyboard focus를 받으면 왼쪽 방향으로 확장해 전체 heading 제목을 보여준다. pointer가 벗어난 뒤 짧은 유예 시간 후 축소하되, focus가 내부에 있거나 사용자가 항목을 누르는 동안에는 닫지 않는다.
- 확장 패널은 현재 heading을 `aria-current="location"`으로 표시하고 `h3`를 시각적으로 들여쓴다. 제목이 긴 항목은 최대 두 줄까지 표시한 뒤 말줄임하며, 해당 요소의 accessible name에는 전체 제목을 유지한다.
- 항목을 선택하면 같은 parser가 만든 fragment로 이동하고 URL hash를 `history.pushState` 계약에 맞춰 갱신한다. 브라우저 뒤로가기로 이전 fragment와 스크롤 위치를 복원할 수 있어야 한다. 고정된 전역 header에 heading이 가리지 않도록 본문 heading에 공통 `scroll-margin-top`을 적용한다.
- 현재 heading은 `IntersectionObserver`로 추적한다. header 아래의 읽기 기준선을 지난 마지막 heading을 현재 항목으로 삼고, 문서 끝에서는 마지막 heading을 유지한다. 관찰 대상이 많아도 heading별 scroll listener를 만들지 않는다.

모바일과 coarse pointer 환경에서도 오른쪽 중앙의 같은 선 인디케이터를 사용한다. hover를 흉내 내지 않고 첫 tap으로 목차를 열며, 우하단은 기존 챗봇 버튼 전용 공간으로 남긴다.

- 인디케이터의 시각적 선은 작게 유지하되 전체 trigger는 최소 `44 × 44px` hit area를 확보한다. safe-area와 viewport 높이를 고려해 오른쪽 중앙에 둔다. `ChatLauncher.module.css`에 흩어진 launcher 크기·right·bottom·모바일 탭 bar offset을 공용 CSS custom property로 승격하고 목차와 챗봇이 같은 값을 사용해 최소 간격을 계산한다. `data-section="dev"`는 현재 모바일 launcher offset selector에 이미 포함되므로 article 상세에서도 그 계약을 유지하고 회귀 테스트한다.
- tap하면 오른쪽에서 목차 drawer가 열리고 backdrop을 표시한다. drawer 너비는 작은 화면 대부분을 덮지 않는 범위에서 `min(82vw, 320px)`, 높이는 `100dvh`로 하며 긴 목차만 내부 스크롤한다.
- drawer가 열리면 현재 heading을 처음 보이는 위치로 스크롤한다. focus를 drawer 제목 또는 현재 항목으로 옮기고 focus trap을 적용하며, backdrop tap·닫기 버튼·`Escape`·브라우저 뒤로가기로 닫을 수 있게 한다. 닫은 뒤에는 인디케이터 trigger로 focus를 돌려준다.
- 목차 항목을 선택하면 drawer를 닫고 해당 heading으로 이동한다. heading에는 일시적으로 programmatic focus가 가능하도록 하되 focus ring을 불필요하게 노출하지 않고, 화면 낭독기가 새 섹션의 제목을 인지할 수 있게 한다.
- drawer가 열린 동안에는 배경 본문과 챗봇 trigger를 `inert` 처리해 동시에 조작되지 않게 한다. drawer를 닫으면 기존 챗봇 상태를 바꾸지 않고 상호작용만 복원한다.

인디케이터와 패널은 hover에만 의존하지 않는다. 축소 trigger에는 현지화한 `목차 열기` accessible name과 `aria-expanded`, `aria-controls`를 제공한다. `prefers-reduced-motion`에서는 인디케이터 등장, 패널 확장과 heading 이동을 즉시 처리하고, 그 밖의 환경에서도 scroll animation은 짧게 제한한다. 확대·고대비 모드에서는 선만으로 조작을 요구하지 않도록 focus 시 텍스트 라벨을 함께 드러낸다.

서체는 새 체계를 만들지 않고 현재 전역 토큰을 그대로 사용한다. 블로그 제목, 본문과 본문 heading은 `--font-display`의 Newsreader·Noto Serif KR 계열을 중심으로 구성한다. 날짜, 태그, 목차, 버튼과 페이지 탐색 같은 UI 정보는 `--font-sans`, 인라인 코드와 코드 블록은 `--font-mono`를 사용한다. 기존 개발 화면과 같은 자간·색·굵기 범위 안에서 본문 행간과 최대 폭만 긴 글에 맞게 조정한다. 외부 폰트나 블로그 전용 서체는 추가하지 않는다.

본문 하단 순서:

1. 직접 지정한 연관 프로젝트 카드
2. 블로그 탐색 목록

블로그 탐색 목록은 네이버 블로그와 비슷한 표 형태로 한 번에 5개 글을 보여준다. 현재 글이 포함된 발행일순 페이지를 처음 열고 현재 행을 강조한다. 페이지 번호나 이전·다음 페이지를 누르면 본문은 유지한 채 탐색 목록만 바뀌며, 제목을 눌렀을 때 해당 글로 이동한다. 탐색 페이지는 `?articlePage=` query에 기록해 목록의 `?page=`와 의미를 구분하고 뒤로가기와 키보드 탐색이 가능해야 한다.

전체 페이지 수와 프로젝트 역관계를 계산할 때 본문을 읽지 않는다. 현재 예상 규모에서는 공개 글의 id, slug, 제목, 요약, cover, 태그, 발행일, 읽기 시간과 프로젝트 ID만 담은 projection을 캐시한 뒤 8개·5개 단위로 나눈다. 동일한 `publishedAt`에는 `id asc`를 보조 정렬로 적용한다. 공개되지 않은 글과 현재 언어 경로 밖 URL은 목록에 포함하지 않는다.

## 7. 프로젝트 양방향 연결

글의 `relatedProjectIds`가 관계의 단일 원천이다.

- 블로그 상세: 지정한 순서대로 공개 프로젝트 카드를 표시한다.
- 프로젝트 상세 모달: 해당 프로젝트 ID를 포함한 공개 글의 제목, 발행일과 상세 경로를 발행일순으로 표시한다.
- 삭제·비공개 프로젝트 ID는 공개 출력에서 제외하되 관리자 편집 폼에서는 누락 상태를 알려준다.

프로젝트 모달을 열기 위해 전체 블로그 본문을 내려보내지 않는다. 공개 글의 관계용 projection만 캐시해 사용한다. 프로젝트 카드와 모달의 기존 query 딥링크 계약은 유지한다.

## 8. 언어, 번역과 SEO

목록·버튼·메타 UI와 글의 제목·요약·대표 이미지 설명·태그는 현재처럼 한국어와 영어를 제공한다. Markdown 본문만 한국어 원문을 두 언어 경로에서 그대로 보여준다.

- 영어 경로에는 `This article is available in Korean only.` 안내를 표시한다.
- 본문 컨테이너에 `lang="ko"`를 지정해 브라우저와 보조 기술이 콘텐츠 언어를 알 수 있게 한다.
- Chrome의 번역 제안은 브라우저 정책이므로 사이트가 강제로 열지 않는다. 올바른 `lang` 정보와 번역 가능한 일반 텍스트 DOM을 제공한다.
- 코드, 파일명과 고유명사는 번역 대상 문장과 구분한다.

발행된 한국어 상세 URL을 sitemap에 넣고 해당 언어의 제목·요약, 대표 이미지, 발행일과 수정일로 metadata 및 Article 구조화 데이터를 만든다. 영어 경로도 영어 metadata와 한국어 본문으로 접근할 수 있지만 canonical은 같은 slug의 한국어 URL을 가리킨다. 초안과 관리자 미리보기에는 `noindex`를 적용한다. 본문 번역본은 없으므로 서로 다른 언어의 완전한 번역 문서인 것처럼 잘못된 hreflang 콘텐츠를 만들지 않는다.

## 9. 통합검색, RAG와 챗봇

발행된 블로그를 통합검색의 `dev` 문서에 포함한다. `DevArticle.title`과 `summary`, 블로그 태그가 이미 `LocalizedText` 계약을 따르므로 `SearchDocument`를 위한 예외적인 `{ ko, en: ko }` 포장은 만들지 않고 현재 언어 값을 그대로 투영한다. 검색 결과는 블로그 제목, 요약, 태그와 상세 경로를 반환하며 초안은 제외한다. 한국어 Markdown 본문의 검색 평문은 양쪽 언어 경로에서 같은 원문을 사용한다.

RAG 청크는 글 전체를 한 덩어리로 저장하지 않고 제목·요약과 Markdown heading 단위의 평문으로 만든다. 코드 블록은 질문에 필요한 언어와 핵심 코드를 보존하되 임베딩 입력과 모델 문맥 예산을 제한한다.

- 발행·수정 시 해당 글 청크를 증분 생성한다.
- 발행 취소·삭제 시 해당 글 청크를 제거한다.
- `/admin/maintenance` 일괄 재생성에도 블로그를 포함한다.
- source type에 `article`을 추가하고 글 ID와 slug를 기록한다.

글 상세에서는 화면 문맥 대상 `{ type: "article", id }`를 전송하며 `id`에는 slug가 아니라 변경되지 않는 article 문서 ID를 사용한다. `chat-context.ts`의 정확 경로 매핑만으로는 동적 `/dev/articles/[slug]`를 검증할 수 없으므로 앨범 상세와 같은 명시적 경로 정규식 분기를 추가한다. 서버는 pathname의 slug와 문서 ID로 다시 읽은 공개 글의 slug가 일치하는지 검증한 뒤 `제목·요약·slug`만 `SCREEN_CONTEXT`에 넣는다.

현재 `searchRagChunks`의 section 필터에 `sourceType/sourceId` scope를 선택적으로 추가한다. 열린 글 질문은 먼저 `section=dev, sourceType=article, sourceId={문서 ID}` 안에서 검색하고 관련 결과가 부족할 때 전체 `dev` RAG로 확장한다. 이 확장은 기존 section-only 호출의 결과와 API를 깨뜨리지 않아야 한다. “이 글에서 왜 이렇게 했어?” 같은 질문은 현재 글을 우선하되 전체 Markdown이나 클라이언트가 보낸 본문을 신뢰하지 않는다.

챗봇 참조 유형에 블로그를 추가해 검증된 글 카드만 반환한다. 카드에는 제목, 발행일, 요약과 상세 경로를 사용하며 프로젝트처럼 공개 데이터에서 다시 확인한다. mock·live 평가에는 블로그 검색과 열린 글 화면 문맥 사례를 각각 추가한다.

## 10. WebMCP

WebMCP는 내장 챗봇과 분리된 기존 원칙을 유지한다. `/dev/articles`와 상세 페이지에서만 다음 읽기 도구를 등록한다.

| 도구              | 입력                          | 출력                                    |
| ----------------- | ----------------------------- | --------------------------------------- |
| `list_blog_posts` | `tag?`, `limit?`              | 제목, 발행일, 요약, slug와 상세 경로    |
| `get_blog_post`   | `articleId?`, `slug?` 중 하나 | 현재 글 또는 지정한 글의 요약·목차·경로 |

두 식별자를 함께 받으면 오류를 반환한다. 둘 다 없고 상세 페이지라면 현재 글을 사용하며, 목록 페이지라면 식별자를 요청한다. 전문은 도구 출력 예산 안에 억지로 넣지 않고 요약, 목차와 경로를 반환한다. 페이지별 도구는 전역 2개와 합쳐 4개이므로 기존 최대 5개 기준을 넘지 않는다. 관리자와 초안에는 등록하지 않는다.

## 11. 저장 후 갱신 계약

Firebase 저장 성공 뒤 변경 유형에 맞는 기존 tag 기반 재검증 경로를 사용한다.

| 변경                       | 갱신 대상                                                      |
| -------------------------- | -------------------------------------------------------------- |
| 초안 저장                  | 관리자 목록·미리보기만                                         |
| 발행·발행 글 수정          | 공개 목록·상세, 프로젝트 연관 글, 통합검색 projection, sitemap |
| 발행 취소·삭제             | 위 공개 캐시 제거, 검색 문서 제거, 해당 article RAG 청크 제거  |
| 본문·제목·요약·태그 수정   | 해당 article RAG 청크 증분 교체                                |
| slug 외 공개 metadata 수정 | 상세 metadata·구조화 데이터와 챗봇·WebMCP 공개 projection 갱신 |

캐시 무효화 요청이 실패해도 저장 결과를 되돌리지 않는다. 관리자에게 재검증 실패를 표시하고 `/admin/maintenance`에서 검색 projection과 RAG를 복구할 수 있게 한다.

RAG 동기화는 공개 검색에 영향을 주는 변경에만 실행한다.

- 초안 생성·수정에는 호출하지 않는다.
- 최초 발행에는 article 청크를 생성한다.
- 발행된 글의 제목·요약·본문·태그가 바뀌면 해당 청크를 교체한다.
- 발행일·대표 이미지·연관 프로젝트만 바뀌면 호출하지 않는다.
- 발행 취소·삭제에는 해당 청크를 제거한다.
- 동기화 실패는 저장을 되돌리지 않고 maintenance의 stale 상태와 일괄 재생성으로 복구한다.

현재 `listCrud`는 `ragSourceType`이 있으면 create·update·공개 상태 변경·삭제 뒤에 항상 RAG sync를 요청하므로 위 계약을 그대로 표현할 수 없다. 우선 `listCrud`에 저장 전후 entity와 작업 종류를 받아 `sync`, `remove`, `skip`을 반환하는 선택적 후처리 정책을 주입할 수 있도록 범용 확장한다. 정책을 전달하지 않은 기존 컬렉션은 지금과 같은 동작을 유지해 회귀를 막는다. 블로그 정책은 이전 문서를 읽어 공개 상태와 RAG 입력 필드의 실질적 변경을 비교하고, 위 표에 따라 동기화 작업을 결정한다. 이 추상화가 다른 도메인을 불필요하게 복잡하게 만들거나 원자적인 이전 상태 조회를 보장하지 못하면 같은 정책 인터페이스를 쓰는 블로그 전용 CRUD adapter로 제한하되, 호출부에서 임의 조건을 중복 구현하지 않는다.

Firestore 저장 성공과 RAG 요청은 하나의 원자적 transaction이 아니므로 저장 후 동기화 실패를 명시적으로 반환하고 stale 상태를 남긴다. 재시도 때문에 문서를 중복 생성하지 않도록 sync/remove 작업은 article 문서 ID 기준으로 멱등이어야 한다.

## 12. 구현 단계

### B1 — 개발 정보 구조 개편

- `/dev`에 기존 소개를 옮기고 `/dev/about` 리다이렉트를 추가한다.
- 경력 페이지에 기술 스택을 합친다.
- 데스크톱 mega-menu, 모바일 메뉴·탭, route 상수, 사전과 sitemap을 갱신한다.
- 기존 직접 링크, 로케일 prefix와 활성 메뉴 판정을 회귀 테스트한다.

### B2 — Mock 데이터와 안전한 Markdown renderer

- `DevArticle` 모델, repository 계약과 경계 사례를 담은 mock 글을 추가한다.
- Markdown parser, sanitizer, 목차·읽기 시간과 코드 하이라이터를 순수 함수 경계로 만든다.
- 이미지·YouTube 전용 문법과 서버 렌더링을 검증한다.

### B3 — Mock 기반 관리자 작성 환경

- 다국어 제목·요약·대표 이미지 설명, 한국어 Markdown 본문, slug 제안·중복 검사, 발행일 입력, 다국어 블로그 태그 사전의 선택·추가와 연관 프로젝트 선택을 구현한다.
- drag reorder가 없는 발행일 기반 관리자 목록 hook과 body를 제외한 목록 projection 계약을 mock 단계부터 분리한다.
- Markdown 편집/서버 미리보기 토글과 커서 위치 이미지·YouTube 삽입을 mock uploader로 구현한다.
- 개발용 브라우저 로컬 초안 adapter로 저장·수정·미리보기 흐름을 검증한다.
- 관리자 전용 전체 페이지 미리보기를 연결한다.
- 이 단계에서 프로젝트 최초의 관리자 E2E harness를 만든다. `NEXT_PUBLIC_USE_MOCK=1`만으로는 Firebase Auth 기반 `AuthGuard`를 통과하지 못하므로 mock content source와 별개의 테스트 인증 adapter를 `AuthGuard` 경계에 주입하는 방식을 기본안으로 사용한다. 이 adapter는 E2E 전용 명시적 환경 변수와 비-production 환경이 함께 만족될 때만 관리자 세션을 제공하고, production build에서는 설정 자체를 거부한다. 실제 Firebase 권한 검증은 B5의 Auth/Rules emulator 테스트로 분리하며 mock UI E2E에서 emulator auth를 필수로 만들지 않는다. mock repository와 localStorage 초기화, 작성 → 로컬 복구 → 저장 → 전체 미리보기 → 발행 흐름을 격리해 검증하고 이후 관리자 기능도 재사용할 수 있는 fixture로 둔다.

### B4 — Mock 기반 공개 목록과 상세

- 사진 작업 목록의 인라인 toolbar와 사진 전용 `FilterBar`에서 각각 범용 page toolbar와 tag chip row primitive를 먼저 추출하고 사진 회귀 테스트를 통과시킨다. 기존에 준비된 공용 컴포넌트를 단순 재사용하는 작업으로 간주하지 않는다.
- boolean과 사진 아이콘에 고정된 `ViewToggle`을 option id·label·icon을 받는 범용 segmented control로 리팩터링하고, 블로그에서 사이트 최초의 URL 기반 `?view=grid|list` 상태와 태그 필터·pagination을 구현한다. 사진의 로컬 view state를 URL로 옮기는 일은 이 범위에 포함하지 않는다.
- 앨범 상세 hero에서 공용 hero primitive를 추출해 대표 이미지·실제 텍스트·뒤로가기·공유를 갖춘 블로그 hero를 구현한다.
- 대표 이미지 없는 hero 대체 디자인, 상세 본문, 목차, 코드 테마, 미디어, 연관 프로젝트와 하단 블로그 탐색 목록을 구현한다.
- 노션식 floating 목차의 heading 계층·현재 위치 추적·데스크톱 hover/focus 확장·모바일 drawer·fragment/history 복원을 component와 E2E 테스트로 고정한다.
- 한국어 본문 언어 표시, 영어 안내, metadata, sitemap과 구조화 데이터를 추가한다.
- 공개 화면과 관리자 작성 흐름의 mock E2E가 통과하면 콘텐츠 계약을 고정한다.

### B5 — Firebase 전환과 배포

- `devArticles` getter·CRUD, 발행일 기반 관리자 목록 hook, body 없는 `admin-list-rest` projection과 실제 이미지 uploader를 repository 경계에 연결한다.
- `devArticleTags` 별도 컬렉션 기본안을 확정하거나 config 문서 대안을 선택하고, 선택한 저장소의 Rules·공개 getter·cache tag·관리자 CRUD와 사용 중 삭제 방지 테스트를 추가한다.
- REST query builder를 다중 정렬 방향에 맞게 범용 확장하고 `publishedAt desc + id asc` 공개 쿼리와 복합 인덱스를 추가한다. 태그는 초기에는 projection을 서버에서 필터링하며 `array-contains` 인덱스는 규모에 따른 전환 시점까지 만들지 않는다.
- `listCrud`의 선택적 후처리 정책 또는 같은 계약의 article adapter로 조건부 RAG sync를 구현하고 기존 CRUD의 동작을 회귀 테스트한다.
- Firestore·Storage Rules와 index를 emulator에서 검증한 뒤 Firebase에 배포한다.
- 실제 초안 한 건으로 작성·전체 미리보기·발행·발행 취소·삭제와 이미지 정리를 확인한다.
- `/admin/maintenance`의 고아 이미지 dry run·재검증·확인 삭제를 검증한다.
- mock/live 데이터 선택이 섞이지 않고 mock 자동화 테스트가 계속 동작하는지 확인한다.

### B6 — 검색·RAG·챗봇·WebMCP

- 다국어 article metadata와 태그를 기존 `SearchDocument` 계약에 그대로 투영해 통합검색과 랭킹에 블로그를 추가한다.
- RAG 일괄·조건부 증분 동기화, 청크 상태와 `sourceType/sourceId` 우선 검색 scope를 확장한다.
- 동적 article slug 경로 검증과 문서 ID `openTarget`, 화면 문맥, 참조 카드, mock/live 평가를 추가한다.
- 블로그 WebMCP 도구 2개를 구현하고 기존 페이지별 도구 상한을 재검증한다.

### B7 — 검증과 마이그레이션

- 기존 글을 실제 발행일과 slug로 입력하고 이미지·코드·YouTube가 포함된 대표 글을 점검한다.
- Rules emulator, unit, component, E2E, 접근성, typecheck, lint와 production build를 실행한다.
- 공개 후 검색 인덱스·RAG 완료율, Storage 고아 파일과 이전 `/dev/about` 유입을 확인한다.

## 13. 주요 구현 영역

| 영역                     | 기존 또는 예상 진입점                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| 개발 경로·메뉴           | `constants/routes.ts`, `navigation.ts`, `dictionary.ts`                                   |
| 콘텐츠 타입              | `types/dev-article.ts`, `types/localized.ts`                                              |
| 블로그 태그 사전         | `types/dev-article-tag.ts`, dev article repository 경계                                   |
| mock·공개 getter         | `mocks/dev-articles.ts`, `lib/content/dev-articles.ts`                                    |
| Firebase 공개 query      | `lib/firebase/public/transport.ts`, `lib/firebase/public/`                                |
| Firebase 관리자 CRUD     | `lib/firebase/list-crud.ts`, `lib/firebase/admin-list-rest.ts`, article adapter           |
| 관리자 목록 state        | 신규 article hook; 기존 정렬 훅의 실제 위치는 `hooks/use-ordered-admin.ts`                |
| Markdown 처리            | `features/dev-blog/_lib/markdown-*`                                                       |
| 공개 목록·상세           | `features/dev-blog/`, `app/[lang]/(public)/dev/articles/`                                 |
| 관리자 CMS·E2E           | `features/admin-dev-articles/`, `app/admin/dev/articles/`, 기존 E2E fixture 경계          |
| 이미지 Storage           | `lib/firebase/storage.ts`, `storage.rules`                                                |
| 고아 이미지 관리         | `features/admin-maintenance/`, `/admin/maintenance`                                       |
| Rules·index              | `firestore.rules`, `firestore.indexes.json`                                               |
| 통합검색                 | `features/search/_lib/search-documents.ts`, `types/search.ts`                             |
| RAG                      | `lib/content/rag-source.ts`, `lib/ai/rag-chunks.ts`, `lib/ai/rag-search.ts`               |
| 챗봇 전송·경로 계약      | `features/chat/_lib/chat-context.ts`, `features/chat/_lib/resolve-chat-screen-context.ts` |
| 챗봇 표시용 화면 context | `lib/chat-screen-target-context.ts`, `hooks/use-register-chat-screen-target.ts`           |
| floating UI 위치         | `features/chat/_components/ChatLauncher.module.css`, 공용 CSS custom property             |
| WebMCP                   | `features/dev-blog/_hooks/use-dev-blog-tools.ts`                                          |
| SEO·OG                   | sitemap, article metadata·구조화 데이터, 기존 `/dev-project-image` 생성 경로              |
| 개인정보·외부 미디어     | legal 문서와 YouTube 요청 정책                                                            |

실제 파일명은 기존 feature 경계와 naming 규칙을 확인한 뒤 확정한다. 위 표와 다른 위치를 선택하면 같은 책임을 중복 구현하지 않았는지 문서에 근거를 남긴다.

## 14. 완료 기준

- 개발 메뉴와 URL이 `소개 → 경력·기술 → 프로젝트 → 블로그` 구조로 동작한다.
- 관리자가 발행일과 slug를 정해 Markdown 글을 작성하고 실제 레이아웃으로 미리 볼 수 있다.
- 제목·요약·대표 이미지 설명과 태그는 한국어·영어로 저장·표시하고, Markdown 본문만 한국어 단일 원문 계약을 유지한다.
- 주요 언어의 코드 블록이 라이트·다크 테마에서 읽기 좋게 표시된다.
- 본문 임의 위치에 이미지와 검증된 YouTube 영상을 넣을 수 있다.
- `/admin/maintenance`에서 어떤 글도 참조하지 않는 24시간 이전 이미지만 확인 후 정리할 수 있다.
- 대표 이미지 유무에 관계없이 목록 카드가 기존 개발 디자인과 어울린다.
- 목록의 태그 선택과 그리드/목록 전환이 URL에 보존되고 pagination과 함께 뒤로가기·공유 URL에서 복원된다.
- 사진의 태그 행·보기 전환과 앨범의 hero에서 추출한 공용 컴포넌트가 기존 사진 화면을 회귀시키지 않는다.
- 글 상세 hero에 대표 이미지, 실제 텍스트 제목·metadata, 목록 복귀와 공유 동작이 있고 이미지가 없어도 같은 정보 위계와 대비를 유지한다.
- 제목과 긴 본문은 Newsreader 기반의 기존 display 서체 토큰을 사용하고 UI·코드는 기존 sans·mono 역할을 유지한다.
- 노션식 floating 목차가 본문 구간의 오른쪽 가장자리에서 현재 `h2/h3` 위치를 표시하고 데스크톱 hover/focus와 모바일 tap 모두로 열리며, 챗봇 버튼과 겹치거나 동시에 조작되지 않는다.
- 목차 이동, URL fragment, 브라우저 뒤로가기, 키보드 focus와 reduced motion이 같은 heading id 계약으로 동작한다.
- 프로젝트 모달에서 공개된 연관 글을 역방향으로 찾을 수 있다.
- 영어 경로에서도 한국어 원문과 언어 안내가 올바르게 표시된다.
- 초안은 공개 getter, sitemap, 검색, RAG, 챗봇 참조와 WebMCP에 노출되지 않는다.
- 관리자 목록은 Markdown body를 내려받지 않고 발행일순으로 동작하며 drag order를 요구하지 않는다.
- 관리자 E2E가 격리된 mock repository에서 작성·로컬 복구·저장·전체 미리보기·발행 흐름을 검증한다.
- 기존 `order asc` 공개 query와 CRUD의 RAG 동작을 회귀시키지 않으면서 article의 발행일 정렬과 조건부 RAG 정책이 적용된다.
- 열린 글을 가리키는 챗봇 질문이 해당 글의 공개 데이터와 RAG 청크를 우선 사용한다.
- 관련 Rules, 테스트, 접근성 검사와 production build가 통과한다.

## 15. 이번 범위에서 제외

- 댓글, 좋아요, 조회수와 구독
- 다국어 본문 작성·자동 번역·번역본 저장
- 임의 HTML, MDX와 실행 가능한 데모
- 자체 동영상 업로드·변환·스트리밍
- 시리즈, 예약 발행, RSS와 이메일 뉴스레터
- 외부 에이전트나 챗봇의 글 작성·수정 도구
