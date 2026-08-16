# 통합검색 서버 대조 전환 계획

> 상태: **계획 (미착수)**. 조사일 2026-08-16, 검수 반영 2026-08-17
> 선행 결정: [ADR-0005](../adr/0005-supabase-migration.md) (데이터 계층 Supabase), [ADR-0001](../adr/0001-serverless-rag.md) (서버리스 RAG)
> 원칙 유지: 서버 0대, 월 $0. RLS가 보안 경계의 전부. 공개 읽기는 ISR + 태그 무효화.
> 초안은 pgroonga 도입을 1단계로 잡았다. 검수에서 랭킹 계약 변경 문제가 드러나 2단계로 미뤘고, 이어진 비용 산정에서 조건부 보류로 내렸다. 경위는 §6.
> **착수 대상은 1단계(§3)뿐이다.** §4는 조건이 성립할 때 다시 꺼내는 설계다.

## 1. 문제

`/search` 결과 페이지가 두 번 그려진다. 설계상 그렇다.

| 단계 | 시점     | 내용                                                                         |
| ---- | -------- | ---------------------------------------------------------------------------- |
| 1차  | 0ms      | 서버가 넘긴 검색 인덱스를 클라이언트가 대조. 제목·요약·태그·목차 매치만 표시 |
| 2차  | 약 890ms | `/api/search-body` 응답 도착. 블로그 본문 매치를 목록에 추가                 |

`src/features/search/_components/SearchResults.tsx:129` 에서 본문 매치는 `score: 0` 으로 들어가 블로그 그룹 맨 아래에 붙는다. 읽고 있던 목록이 아래로 자라고 상단 총계 배지 숫자가 바뀐다. 그 사이 진행 중이라는 표시는 없다. `bodyPending` 분기(`:94`)는 총계가 0일 때만 "검색 중"을 띄우므로, 1차에서 한 건이라도 잡히면 2차 대기 상태가 화면에 드러나지 않는다.

2026-08-16 프로덕션(`sungjoon.works`) 실측:

```
GET /api/search-index   193 docs · 156KB raw · 29KB gzip · CDN warm 70ms
                        구성: photo 174 / dev 12 / music 7
GET /api/search-body    질의당 origin 왕복 890ms (cold), 응답 724B
```

890ms 중 대조 연산이 차지하는 비중은 작다. 본문 대조는 `indexOf` 한 번이고 글 본문은 모듈 Map에 캐시되어 있다(`search-article-bodies.ts:36`). 비용의 대부분은 Vercel 함수 기동과 왕복이다.

별개로 알려진 비대칭이 하나 있다. 자동완성은 인덱스(제목·요약·태그·목차)만 보고 결과 페이지만 본문까지 본다. 같은 질의에 대해 드롭다운에는 안 뜨는데 결과 페이지에는 뜨는 글이 생긴다.

**이 비대칭은 이 계획의 범위가 아니다.** 1단계도 2단계도 자동완성 경로를 건드리지 않으므로 그대로 남는다. 결함이 아니라 계약으로 확정한다. 자동완성은 아는 항목으로 바로 가는 수단이라 제목 상위 5건이면 충분하고, 본문 일치는 결과 페이지에서 제공한다. 본문을 `/api/search-index` 에 실으면 글 수에 비례해 방문자 다운로드가 커지는데, 그 이유로 처음부터 뺀 데이터다(`features/dev-blog/_lib/article-search-source.ts`). 계약을 바꾸려면 별도 과제로 다룬다.

## 2. 두 단계로 나눈다

초안은 pgroonga 색인 테이블 도입과 렌더 통합을 한 번에 하려 했다. 검수에서 드러난 문제는 이 둘의 성격이 다르다는 것이다.

렌더 통합은 화면 문제다. 검색 결과가 달라지면 안 된다.
pgroonga 도입은 랭킹 엔진 교체다. 검색 결과가 반드시 달라진다.

`matchedTokenRatio`(`src/lib/text/token-match.ts`)는 단순 임계값이 아니다. 질의 토큰이 문서에 통째로 없어도 한글 3자 이상 조각이 걸리면 1점, 2자 조각이면 0.5점을 준다. "수상내역"이 문서의 "우수상"에 닿게 하려고 넣은 규칙이다. 이걸 SQL로 옮기면 두 구현이 갈라지고, 안 옮기면 검색 결과가 바뀐다. pgroonga의 공백 분리 AND 검색은 여기에 더해 3토큰 중 2토큰만 맞는 문서를 아예 제외한다.

그래서 순서를 바꾼다.

- **1단계**: 렌더 통합. DB 변경 없음. 같은 TS 코드가 서버에서 돌아 결과가 100% 동일하다.
- **2단계**: pgroonga 색인 테이블. 조건부 보류. 착수 조건과 근거는 §4.1.

1단계가 없애는 것은 결과 목록의 증분 렌더다. §1의 자동완성 비대칭은 범위 밖이고 두 단계 후에도 남는다. 나눠 놓고 보니 2단계는 지금 얻을 것이 거의 없다. 자동완성을 클라이언트에 남기기로 한 순간 초안이 내세운 "색인이 브라우저로 통째로 내려간다"는 논거가 성립하지 않는다. `/api/search-index` 는 자동완성과 WebMCP 도구 때문에 그대로 나가므로, 2단계를 해도 방문자 다운로드는 줄어들지 않는다.

## 3. 1단계: 서버 렌더 통합

### 3.1 구조

`/search` 페이지는 이미 서버에서 전 문서를 가져온다(`fetchSearchDocuments()`, ISR 캐시). 클라이언트가 하던 대조를 그 자리로 올린다.

```
현재   서버: 전 문서 / 클라: 대조 + 렌더 / 클라: /api/search-body fetch / 목록 갱신
변경   서버: 전 문서 + searchArticleBodies(q) + 대조 + 완성된 목록 렌더
```

대조 코드는 옮기지 않는다. `createDocumentScorer`, `splitTextByMatches`, `tokensFor` 는 순수 함수라 서버 컴포넌트에서 그대로 호출된다. 결과가 달라질 여지가 없다.

두 조회는 반드시 병렬로 시작한다.

```ts
const [documents, bodyMatches] = await Promise.all([
  fetchSearchDocuments(),
  searchArticleBodies(q),
]);
```

순차로 await하면 두 번째가 첫 번째 완료 후에 시작한다. `getDevArticles()` 가 React `cache` 로 감싸져 있어 같은 요청 안에서 DB 조회는 한 번뿐이지만, 마크다운 평문화(`articlePlainText`)는 캐시 대상이 아니다. `bodyCache` 가 비어 있는 콜드 인스턴스에서는 그 파싱 시간이 나머지 getter 시간에 그대로 더해진다. 병렬로 두면 겹쳐서 흡수된다.

### 3.2 파일별 변경

`src/app/[lang]/(public)/search/page.tsx`

`params` 와 `searchParams` 를 await하지 않고 Suspense 하위로 넘긴다. Next 16.3 동봉 문서가 명시하는 규칙이다. 페이지 최상단에서 await하면 그 아래 전부가 dynamic이 되어 셸조차 스트리밍되지 않는다.

```tsx
export default function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Lang }>;
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchResults paramsPromise={params} searchParamsPromise={searchParams} />
    </Suspense>
  );
}
```

`params` 를 함께 넘기는 것이 핵심이다. 현재 `SearchResults` 는 `useLang()` 에서 `lang` 과 `dict` 를 둘 다 받아 그룹명, 앨범 라벨, 빈 결과 문구, `pickText` 언어 선택에 쓴다(`SearchResults.tsx:66`). 서버 컴포넌트에는 컨텍스트가 없으므로 `lang` 을 받아 `DICTIONARY[lang]` 을 직접 조회한다.

`src/features/search/_components/SearchResults.tsx`

`"use client"` 를 걷어낸다. 없어지는 것은 `useSearchParams`, `useLang`, 본문 fetch `useEffect`, `bodyResult` 상태, `bodyPending` 파생, `useMemo` 세 개다. 대조 루프와 그룹 배치(dev, blog, photo, music 순)는 그대로 남는다.

본문 매치는 `searchArticleBodies(q)` 를 직접 await해서 얻는다. 라우트를 거치지 않으므로 질의 길이 검증(`MIN_QUERY_CHARS`, `MAX_QUERY_CHARS`)이 서버 함수 안에서만 적용된다. 지금 클라이언트에 중복으로 박혀 있는 `q.length < 2 || q.length > 100` 조건(`:78`)은 삭제한다. 같은 값을 두 곳에 두지 않게 된다.

### 3.3 삭제

`src/app/api/search-body/route.ts` 만 지운다. `search-article-bodies.ts` 는 남긴다. 서버 컴포넌트가 직접 호출하며 모듈 `bodyCache` 도 계속 유효하다.

### 3.4 유지

`/api/search-index`, `load-search-index`, `suggest-documents`, `rank-documents`, `score-documents`, `highlight-title`, `SearchBox`, `MobileMenu` 검색 폼, WebMCP `search_portfolio` 도구. 자동완성 경로는 한 줄도 건드리지 않는다.

### 3.5 트레이드오프

첫 페인트가 서버 렌더만큼 늦어진다. 지금은 셸과 1차 목록이 즉시 나온다. 전환 후에는 `loading.tsx` 스켈레톤이 먼저 뜬다.

대신 사라지는 비용이 있다. 지금도 결과 페이지가 완성되기까지 890ms를 기다린다. 그 시간이 화면에 안 보이게 숨겨져 있을 뿐이다. 전환 후에는 같은 시간이 스켈레톤으로 정직하게 보인다.

페이지가 dynamic이 된다. `searchParams` 를 읽으므로 라우트 캐시에 올라가지 않는다. 데이터 계층(`fetchSearchDocuments`, `getDevArticles`)은 ISR 캐시를 그대로 쓰므로 질의마다 DB를 치지는 않는다.

완화책으로 `loading.tsx` 에서 이미 메모리에 있는 인덱스로 근사 목록을 먼저 그리는 방법을 구현했다가 걷어냈다. **채택하지 않는다.**

근사 목록은 클라이언트 인덱스만 보므로 블로그 본문 매치를 담을 수 없다. 그래서 본문에 걸리는 질의에서 목록이 두 번 바뀐다. 실데이터 193문서 기준으로 재보면 이렇다.

| 질의       | 근사 | 확정 |
| ---------- | ---- | ---- |
| 브라우저   | 1건  | 5건  |
| 옮긴       | 0건  | 1건  |
| 포트폴리오 | 3건  | 3건  |
| react      | 4건  | 4건  |

본문 매치가 있는 질의에서만 달라지는데, 하필 그 질의가 "본문 결과가 늦게 뜬다"는 원래 불만의 대상이다. 완화하려던 증상을 다른 형태로 남긴다.

서버 렌더 실측이 이 판단을 굳혔다. 프로덕션 빌드에서 실데이터 193문서 기준 warm 45~80ms, cold 133ms다. 근사 목록으로 가릴 만한 지연이 아니다. 스켈레톤을 유지하다 완성된 목록을 한 번에 내보낸다.

### 3.6 검증

| 항목        | 통과 조건                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 결과 동일성 | 전환 전후로 같은 질의의 결과 집합과 순서가 일치. 최소 포함: 빈 문자열, 1자, 101자, 한글 1토큰, 한글 2토큰, 영문, 초성 `ㅍㅌ`, 본문에만 있는 단어, 앨범 제목, 없는 단어 |
| 렌더 횟수   | 목록이 한 번만 그려진다. 총계 배지가 바뀌지 않는다                                                                                                                     |
| 테스트      | `SearchResults.test.tsx` 를 서버 컴포넌트 기준으로 재작성. `search-article-bodies.test.ts` 는 유지                                                                     |
| mock 모드   | `NEXT_PUBLIC_USE_MOCK=1 npm run dev` 에서 정상                                                                                                                         |

결과 동일성 검증은 골든 테스트로 고정한다. 2단계에서 이 테스트가 깨지는 것이 곧 랭킹 계약이 바뀌었다는 신호다.

## 4. 2단계: pgroonga 색인 테이블 (조건부 보류)

### 4.1 착수 조건

초안은 "검색 문서 1,000건"을 조건으로 잡았다. 문서 수는 표면적인 지표라 조건을 다시 세웠다.

2단계가 주는 것은 셋이고, 지금 값이 있는 것은 하나뿐이다.

| 이득                                                  | 지금 값                                              |
| ----------------------------------------------------- | ---------------------------------------------------- |
| TF 기반 점수와 컬럼 가중치                            | 193건에서는 상위 몇 건의 순서가 조금 바뀌는 정도다   |
| 본문 검색을 블로그 밖으로 확대                        | 본문이 있는 콘텐츠가 블로그뿐이라 확대할 대상이 없다 |
| 서버 렌더의 전 콘텐츠 fetch·파싱을 SQL 한 번으로 대체 | 유일하게 실질적인 이득이다. 지금은 병목이 아니다     |

세 번째가 조건이 된다. 1단계 이후 `/search` 는 요청마다 `fetchSearchDocuments()` 와 `getDevArticles()` 로 전 콘텐츠를 서버 메모리에 펼친다. ISR 캐시라 DB는 치지 않지만 역직렬화와 마크다운 평문화는 매번 한다. `bodyCache` 가 글별로 막아주긴 해도 인스턴스가 새로 뜨면 다시 파싱한다. 글이 늘수록 이 비용이 렌더 시간으로 나타난다.

**조건: 1단계 배포 후 `/search` 서버 렌더 시간을 측정한다. p50이 300ms를 넘고 그 원인이 전 콘텐츠 fetch·파싱이면 2단계를 다시 검토한다.**

원인 확인 없이 착수하지 않는다. 렌더가 느린 이유가 이미지나 콜드 스타트면 2단계로 풀리지 않는다.

### 4.1.1 색인 크기는 2단계로 풀지 않는다

브라우저가 받는 색인이 커지는 문제는 별도 레버다. 2026-08-16 기준 필드별 기여도를 재보면 이렇다.

| 대상                  | gzip 절감                                  |
| --------------------- | ------------------------------------------ |
| 전체                  | 28.1KB (193 docs, photo 174건이 raw의 68%) |
| `index.body` 제거     | 8.7KB                                      |
| `imageUrl` 제거       | 6.3KB                                      |
| `index.choseong` 제거 | 3.3KB                                      |
| `meta` 제거           | 2.2KB                                      |
| `index.title` 제거    | 1.0KB                                      |

`index` 필드 셋을 합치면 13.0KB로 전체의 46%다. 화면에 표시되지 않고 대조에만 쓰는 데이터다. 카메라·렌즈를 `index.body` 에서 빼거나 자동완성에서 초성을 포기하면 즉시 줄어든다. 확장을 켜고 테이블을 만드는 것보다 싸다. 색인 크기를 2단계 착수 근거로 쓰지 않는다.

### 4.2 대안 비교

외부 검색 엔진부터 정리한다.

| 후보                      | 최소 비용                         | 판정                                                                                                                              |
| ------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Elastic Cloud             | $99/월 (Standard, 120GB 2AZ 기준) | 탈락. 영구 무료 관리형 플랜이 없다                                                                                                |
| Elasticsearch 자체 호스팅 | 서버 1대                          | 탈락. 아키텍처 원칙 1 위반                                                                                                        |
| Meilisearch Cloud         | $30/월                            | 탈락                                                                                                                              |
| Typesense Cloud           | $29.99/월                         | 탈락                                                                                                                              |
| Algolia Build             | $0 (월 10,000 search request)     | 조건부. 자동완성은 keystroke당 1 request라 한도가 방문자 수백 명 수준에서 소진된다. 벤더와 색인 동기화 파이프라인이 하나 늘어난다 |

월 $0 원칙을 유지하는 한 외부 엔진은 성립하지 않는다.

Supabase Postgres 안에서는 이렇다.

| 방식                      | Supabase 지원 | 한국어 품질 | 비고                                                                  |
| ------------------------- | ------------- | ----------- | --------------------------------------------------------------------- |
| pgroonga                  | 가능 (PG17)   | 좋음        | Groonga bigram 토크나이저가 CJK를 처리한다. 형태소 분석기가 필요 없다 |
| pg_trgm GIN               | 가능          | 보통        | 한글은 음절 1자가 1문자라 3음절 미만 질의에서 인덱스 효율이 떨어진다  |
| tsvector('simple')        | 가능          | 나쁨        | 공백 분리라 조사·복합어를 다루지 못한다                               |
| tsvector + mecab-ko       | 불가          | (좋음)      | 관리형 Postgres에 설치할 수 없다                                      |
| pg_search (ParadeDB BM25) | 불가          | (좋음)      | AWS RDS·Supabase·Neon 모두 기본 확장 allow-list에 없다                |

### 4.3 pgroonga 사실과 함정

기본 토크나이저는 `TokenBigram` 이다. bigram과 공백 분리를 혼합하므로 한국어는 2음절 단위로 쪼개고 ASCII는 단어 단위로 쪼갠다. 기본 노멀라이저는 `NormalizerAuto` 다.

**최소 버전은 3.1.6이다.** 컬럼 가중치를 지정하는 `pgroonga_condition()` 이 그 버전에 추가됐다. `fuzzy_max_distance_ratio` 인자는 3.2.1이다.

```sql
select *, pgroonga_score(tableoid, ctid) as score
  from memos
 where ARRAY[title, content] &@~
       pgroonga_condition('Groonga OR PostgreSQL',
                          weights => ARRAY[5, 1],
                          index_name => 'pgroonga_memos_index')
 order by score desc;
```

Supabase가 3.1.6 미만을 제공하면 위 SQL은 함수 생성 단계에서 실패한다. **그때는 2단계 착수를 중단한다.** 공식 문서에 캐스트 형태가 하나 나와 있지만(`(query, weights, index_name)::pgroonga_full_text_search_condition`), 그 복합 타입의 필드 구성과 인자 개수가 버전마다 같은지는 확인하지 않았다. 검증하지 않은 SQL을 대안으로 확정해 두지 않는다. 해당 버전이 지원하는 condition 타입과 가중치 문법을 별도로 확인한 뒤 이 절을 갱신한다.

착수 0단계에서 버전 확인만으로는 부족하다. 실제 호출까지 해본다.

```sql
select extversion from pg_extension where extname = 'pgroonga';
select extensions.pgroonga_condition(
  'test',
  weights => array[5, 2, 1],
  index_name => 'search_documents_pgroonga'
);
```

**함정 1. 작은 테이블에서 점수가 0으로 죽는다.** `pgroonga_score` 는 인덱스 스캔으로 검색하지 않으면 항상 `0.0` 을 반환한다. 대상 테이블은 수백 행이고 플래너는 이 크기에서 seq scan을 고른다. 결과 집합은 맞는데 랭킹만 전부 0이 되고 오류도 경고도 없다. 함수 단위 GUC로 막는다. 세션이나 서버 설정에 걸면 안 된다.

```sql
create function ... set enable_seqscan = 'off'
```

함수 진입 시에만 적용되고 반환 시 복원된다. `match_rag_chunks` 가 이미 `set search_path` 를 함수 단위로 쓰고 있어 관용구가 같다. 착수 시 `explain analyze` 로 `Index Scan using search_documents_pgroonga` 를 눈으로 확인한다.

**함정 2. 스니펫 함수가 HTML 문자열을 돌려준다.** `pgroonga_snippet_html` 은 `text[]` 를 반환하고 일치 구간을 `<span class="keyword">` 로 감싼다. 이 프로젝트는 블로그 본문 렌더러를 허용 노드를 React element 로 직접 매핑하는 방식으로 짜서 HTML 문자열 단계 자체를 없앴다(CLAUDE.md 스택 표). `dangerouslySetInnerHTML` 을 다시 들이지 않는다. 평문 스니펫만 SQL에서 만들고 강조는 기존 `splitTextByMatches` 에 맡긴다.

**함정 3. 질의가 그대로 query syntax로 해석된다.** `&@~` 의 오른쪽은 일반 문자열이 아니다. `OR`, `-`, 괄호, 따옴표가 연산자로 동작한다. `C++`, 따옴표가 든 작품명, 닫히지 않은 괄호 같은 현실적인 질의에서 오작동하거나 RPC 오류가 난다. 리터럴 검색이 목적이므로 `pgroonga_query_escape()` 를 적용한다. 1.1.9부터 제공된다.

**함정 4. 초성 검색은 pgroonga 밖이다.** `&^~` 는 일본어 로마자·가나 prefix 검색이다. 한글 초성 대응 기능은 없다. `choseong` 컬럼을 유지하고 `position()` 스캔으로 처리한다. 판정 규칙(`choseongQueryFor`)은 TS에 남기고 호출부가 초성 질의일 때만 별도 RPC를 부른다.

### 4.4 스키마

기존 7개 테이블을 직접 인덱싱하지 않고 투영 테이블을 둔다. 정규화(별칭 확장, 조사 스트립, 불용어, 초성)는 TS에 있고 RAG와 공유하는 코드다. SQL로 복제하면 두 벌이 되고 한쪽만 고쳐지는 사고가 난다. `rag_documents` 와 같은 패턴이다.

`supabase/migrations/2026xxxxxxxxxx_search_documents.sql`:

```sql
create extension if not exists pgroonga with schema extensions;

create table public.search_documents (
  key         text primary key,           -- 'photo-<id>' 등 기존 SearchDocument.key
  section     text not null check (section in ('photo','music','dev')),
  subsection  text check (subsection in ('blog')),
  title       jsonb not null,             -- {ko,en} 표시용
  meta        jsonb,                      -- {ko,en}
  meta_label  text,                       -- 'albums'
  image_url   text not null default '',
  href        text not null,
  title_index text not null default '',   -- normalizeForSearch 결과
  body_index  text not null default '',   -- 장소·프로그램·태그·목차 정규화본
  body_text   text not null default '',   -- 블로그 평문 (articlePlainText)
  choseong    text not null default '',
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);

create index search_documents_pgroonga
  on public.search_documents
  using pgroonga (title_index, body_index, body_text);

alter table public.search_documents enable row level security;

create policy "search_documents_public_read" on public.search_documents
  for select using (true);

create policy "search_documents_admin_write" on public.search_documents
  for all using (public.is_admin()) with check (public.is_admin());
```

쓰기 정책이 없으면 재색인의 upsert와 stale 삭제가 전부 RLS에 막힌다. 기존 8개 테이블이 쓰는 `public.is_admin()` 을 그대로 쓴다.

읽기 정책이 `using (true)` 인 이유는 `published` 컬럼을 두지 않기 때문이다. 빌더가 발행분만 투영하므로 초안이 테이블에 들어가지 않는다. 다른 테이블의 `published or public.is_admin()` 패턴과 다른 점이라 리뷰에서 짚일 자리다.

`sort_order` 는 `createSearchDocuments()` 가 만든 배열의 인덱스다. 현재 동점 tiebreak가 그 배열 순서(섹션 고정 순서 + 관리자 큐레이션)이므로 계약을 명시해 둔다.

```ts
documents.map((document, index) => ({ ...document, sortOrder: index }));
```

### 4.5 RPC

평문 스니펫 헬퍼부터.

```sql
create function public.search_snippet(body text, keyword text, radius integer default 40)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when s.pos = 0 then ''
    else (case when s.start_at > 1 then '…' else '' end)
      || btrim(replace(substr(body, s.start_at, s.len), E'\n', ' '))
      || (case when s.start_at + s.len - 1 < length(body) then '…' else '' end)
  end
  from (
    select
      p.pos,
      greatest(1, p.pos - radius) as start_at,
      least(length(body), p.pos + length(keyword) + radius)
        - greatest(1, p.pos - radius) + 1 as len
    from (select position(lower(keyword) in lower(body)) as pos) p
  ) s;
$$;
```

`search-article-bodies.ts` 의 `snippetAround` 와 같은 규칙이다. 일치 지점 앞뒤 40자, 잘린 쪽에만 말줄임표.

이 함수의 실행 권한은 `anon` 에서 회수하면 안 된다. `search_portfolio` 가 `security invoker` 라 내부 호출도 호출자 권한으로 실행되기 때문이다. 회수하면 방문자 검색이 권한 오류로 전부 실패한다. 남는 선택은 PostgREST에 `/rpc/search_snippet` 이 노출되는 것을 감수하거나 표현식을 `search_portfolio` 안에 인라인하는 것 둘뿐이다.

**인라인으로 간다.** 함수를 따로 두면 읽기는 편하지만 공개 RPC 표면이 하나 늘고, 그 표면을 줄일 방법이 없다. 위 SQL은 인라인할 표현식의 참조 구현으로 남겨 둔다.

본 검색.

```sql
create function public.search_portfolio(query text, match_limit integer default 60)
returns table (
  key text, section text, subsection text,
  title jsonb, meta jsonb, meta_label text,
  image_url text, href text, snippet text, score double precision
)
language sql
stable
security invoker
set search_path = pg_catalog, extensions, public
set enable_seqscan = 'off'
as $$
  with normalized as (
    select
      btrim(query) as q,
      extensions.pgroonga_query_escape(btrim(query)) as escaped
  ),
  matched as (
    select
      d.key, d.section, d.subsection, d.title, d.meta, d.meta_label,
      d.image_url, d.href, d.sort_order,
      public.search_snippet(
        d.body_text,
        coalesce((extensions.pgroonga_query_extract_keywords(n.escaped))[1], n.q)
      ) as snippet,
      extensions.pgroonga_score(d.tableoid, d.ctid) as score
    from public.search_documents d
    cross join normalized n
    where char_length(n.q) between 2 and 100
      and ARRAY[d.title_index, d.body_index, d.body_text]
          operator(extensions.&@~) extensions.pgroonga_condition(
            n.escaped,
            weights => ARRAY[5, 2, 1],
            index_name => 'search_documents_pgroonga'
          )
  )
  select m.key, m.section, m.subsection, m.title, m.meta, m.meta_label,
         m.image_url, m.href, m.snippet, m.score
    from matched m
   order by m.score desc, m.sort_order
   limit greatest(1, least(coalesce(match_limit, 60), 200));
$$;

revoke execute on function public.search_portfolio(text, integer) from public;
grant  execute on function public.search_portfolio(text, integer) to anon, authenticated;
```

`operator(extensions.&@~)` 수식이 필요한 이유는 `match_rag_chunks` 와 같다. 확장이 `extensions` 스키마에 있어 제한된 `search_path` 로는 연산자를 찾지 못한다.

질의 길이를 2자에서 100자로 제한한다. 기존 `search-article-bodies.ts` 의 `MIN_QUERY_CHARS`, `MAX_QUERY_CHARS` 와 같은 값이다. 무인증 공개 RPC라 제한이 없으면 고유 장문 질의로 Data Cache 항목과 DB 부하를 동시에 부풀릴 수 있다.

스니펫 키워드는 추출된 첫 키워드를 쓰는데, 그 키워드가 제목이나 별칭에만 있고 `body_text` 에는 없으면 빈 문자열이 나온다. 본문에서 실제로 일치하는 첫 키워드를 고르도록 테스트로 고정한다.

### 4.6 색인 동기화

```
관리자 저장
  requestPublicRevalidate(...)                 (기존, 원본 콘텐츠 태그)
  POST /api/admin/search-index                 (신규)
       fetchSearchDocuments()                  (기존 코드 그대로)
       블로그는 articlePlainText() 추가
       search_documents upsert + 사라진 key 삭제
       updateTag("db:search_documents")        (같은 라우트 안에서)
```

태그 무효화를 재색인 라우트 안에서 하는 이유는 순서 때문이다. 클라이언트가 따로 호출하면 색인 교체와 캐시 무효화 사이에 창이 생겨, 무효화된 캐시가 옛 색인을 다시 담을 수 있다. 재색인 성공 직후 서버에서 이어서 실행한다.

삭제 처리는 `replaceRagDocuments`(`lib/supabase/rag.ts:172`)의 stale id 계산 방식을 그대로 가져온다. 인증은 기존 `verifyAdminIdToken` 을 쓴다.

**실패 재시도 경로가 없다.** `RevalidateFailureBanner` 가 읽는 저장소(`lib/cache/revalidate-failure-store.ts`)는 `{tags, paths, failedAt, reason}` 만 보존한다. 재시도는 태그와 경로를 다시 무효화할 뿐이라 재색인을 다시 만들지 못한다.

**저장 구조에 `searchIndex: boolean` 을 추가하고 재시도 시 재색인 라우트도 함께 호출한다.** 배너 문구에도 검색 색인을 넣는다. 재색인 실패는 검색 결과가 옛 내용이라는 뜻이고 관리자가 알아야 할 상태다.

`RagStaleBanner` 처럼 수동 작업으로 두는 방법도 있지만, 임베딩 재생성과 달리 검색 재색인은 OpenAI 호출이 없어 비용이 0이다. 사람 손을 기다릴 이유가 없다.

### 4.7 랭킹 계약 변경

pgroonga의 공백 분리 질의는 AND다. 현재 TS 채점기는 질의 토큰의 절반 이상이 맞으면 결과로 인정한다(`MATCH_THRESHOLD = 0.5`). 3토큰 중 2토큰만 맞는 문서는 지금은 결과에 들어가고 pgroonga에서는 빠진다.

여기에 `matchedTokenRatio` 의 부분 문자열 크레딧이 겹친다. "수상내역" 질의가 문서의 "우수상" 에 닿는 동작은 pgroonga의 bigram 토큰화로 자연스럽게 재현되지 않는다.

그러므로 2단계는 검색 결과가 바뀌는 변경이다. 착수 조건은 이렇다.

- §3.6의 골든 테스트가 기준선이다. 2단계에서 이 테스트는 반드시 깨진다.
- 깨진 차이를 항목별로 검토하고 바뀐 결과를 승인한 뒤 기준선을 갱신한다. 조용히 통과시키지 않는다.
- 최소 검토 질의: 2토큰 중 1토큰만 맞는 문서, "수상내역" 계열의 부분 문자열 일치, 영문 대소문자 혼합, `C++`, `foo OR bar`, 따옴표, 닫히지 않은 괄호.

이 검토를 건너뛸 거면 2단계를 하지 않는 편이 낫다.

### 4.8 검증 순서

| 단계 | 작업                                                   | 통과 조건                                                                                     |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 0    | 확장 활성화, 버전 확인, `pgroonga_condition` 실제 호출 | 3.1.6 이상. 미만이면 착수 중단하고 §4.3 갱신                                                  |
| 1    | 테이블·인덱스·RLS 마이그레이션                         | 로컬 `supabase db reset` 통과                                                                 |
| 2    | RLS 테스트                                             | anon SELECT 허용, anon INSERT·UPDATE·DELETE 거부, admin upsert·delete 허용                    |
| 3    | 재색인 라우트 + 1회 실행                               | `select count(*) from search_documents` 가 인덱스 문서 수와 일치                              |
| 4    | RPC 작성                                               | `explain analyze` 출력에 `Index Scan using search_documents_pgroonga`                         |
| 5    | 입력 검증                                              | 빈 문자열, 1자, 101자, `C++`, `foo OR bar`, 따옴표, 괄호에서 오류 없이 빈 결과 또는 정상 결과 |
| 6    | 골든 테스트 검토                                       | §4.7 절차                                                                                     |
| 7    | 결과 페이지 전환                                       | 서버 컴포넌트가 RPC를 부르도록 교체                                                           |

4단계가 유일한 조용한 실패 지점이다. 나머지는 실패하면 오류가 뜬다.

## 5. 롤백

1단계는 이전 커밋 재배포로 되돌아간다. DB를 건드리지 않으므로 되돌릴 상태가 없다.

2단계는 4.8의 6단계 전까지 프로덕션 영향이 없다. 테이블과 RPC가 추가될 뿐 읽는 코드가 없다. 7단계 이후 문제가 생기면 결과 페이지를 1단계 구현으로 되돌린다. `search_documents` 테이블은 남겨도 무해하다. 자동완성 경로를 두 단계 내내 건드리지 않는 이유가 여기에 있다. 어느 지점에서 멈춰도 검색이 동작한다.

## 6. 검수 이력

2026-08-17 검수에서 초안의 문제 6개가 지적됐고 전부 확인해 반영했다.

| 지적                                 | 확인 결과                                                                              | 반영                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `pgroonga_condition` 최소 버전       | 초안의 2.4.0은 틀렸다. 공식 문서상 3.1.6                                               | §4.3에 정정, 캐스트 문법 대안과 실호출 검증 추가 |
| 관리자 쓰기 RLS 정책 누락            | 맞다. `public.is_admin()` 이 실재하고 기존 8개 테이블이 같은 형태를 쓴다               | §4.4 SQL에 명시                                  |
| 재색인 후 캐시 무효화 누락           | 맞다. 실패 저장소는 `{tags, paths, failedAt, reason}` 뿐이라 재색인 재시도 경로가 없다 | §4.6에 무효화 위치와 재시도 설계 선택지 추가     |
| AND 검색과 50% 임계값의 의미 차이    | 맞다. 여기에 `matchedTokenRatio` 의 부분 문자열 크레딧까지 겹친다                      | 계획 전체를 2단계로 분리. §2, §4.7               |
| 질의 escape 및 길이 제한             | 맞다. `pgroonga_query_escape` 는 1.1.9부터 제공                                        | §4.3 함정 3, §4.5 RPC                            |
| 서버 컴포넌트의 lang·dictionary 경로 | 맞다. `SearchResults.tsx:66` 이 `useLang()` 에서 둘 다 받는다                          | §3.2에 `params` 전달 계약 명시                   |

추가로 지적된 `search_snippet` 노출은 한 가지를 뒤집었다. `search_portfolio` 가 `security invoker` 이므로 `anon` 에서 실행 권한을 회수하면 검색 자체가 실패한다. 회수 대신 노출을 감수하거나 인라인한다. 근거는 §4.5.

검수가 밝힌 가장 큰 것은 개별 SQL 오류가 아니라 초안이 두 가지 변경을 하나로 묶고 있었다는 점이다. 화면 문제와 랭킹 엔진 교체는 위험도가 다르고 되돌리는 방법도 다르다.

단계를 나눈 뒤 2단계의 비용을 다시 셌고, 조건부 보류로 내렸다. 두 가지가 근거다.

첫째, 자동완성을 클라이언트에 남기기로 한 시점에 "색인이 브라우저로 통째로 내려간다"는 초안의 논거가 사라졌다. `/api/search-index` 는 계속 나가므로 2단계는 방문자 다운로드를 줄이지 않는다. 색인 크기가 문제라면 필드를 줄이는 쪽이 싸다(§4.1.1).

둘째, 2단계는 검색 결과 변경, 정규화 이원화, 색인이 조용히 낡는 새 실패 모드, DB에 대한 하드 의존을 한꺼번에 들여온다. 마지막 항목이 특히 크다. 1단계까지는 Supabase가 일시정지해도 ISR 캐시로 검색이 살아 있지만 2단계는 그 성질을 깬다. 193건짜리 데이터셋에 이 넷을 지불할 이유가 지금은 없다.

2차 검수(2026-08-17)에서 세 가지가 더 지적됐고 전부 반영했다.

| 지적                                                  | 확인 결과                                                                                                    | 반영                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 자동완성·결과 비대칭이 두 단계 후에도 남는다          | 맞다. 두 단계 모두 자동완성 경로를 건드리지 않는다. "1단계만으로 §1의 증상이 사라진다"는 서술이 부정확했다   | §1에 범위 밖 선언과 UX 계약 확정. §2 문장 수정              |
| 두 서버 조회의 병렬 실행이 명시되지 않았다            | 맞다. `getDevArticles` 는 React `cache` 로 중복 조회가 막히지만 `articlePlainText` 파싱은 캐시 대상이 아니다 | §3.1에 `Promise.all` 계약 추가                              |
| 구버전 캐스트 문법이 미검증 상태로 확정처럼 적혀 있다 | 맞다. 형태 자체는 공식 문서에 있으나 버전별 복합 타입 구성은 확인하지 않았다                                 | §4.3을 착수 중단 계약으로 변경. §4.8 0단계 통과 조건도 수정 |

`search_snippet` 은 인라인으로, 재색인 실패 재시도는 저장 구조 확장으로 확정했다. 선택지를 나열만 하고 판단을 미루면 착수 시점에 같은 고민을 반복하게 된다.

## 7. 출처

pgroonga

- [pgroonga_condition function](https://pgroonga.github.io/reference/functions/pgroonga-condition.html). Since 3.1.6. 인자 `keyword, weights, scorers, schema_name, index_name, column_name, fuzzy_max_distance_ratio`. `fuzzy_max_distance_ratio` 는 3.2.1 추가
- [&@~ operator for non jsonb types](https://pgroonga.github.io/reference/operators/query-v2.html). 멀티컬럼 `ARRAY[...] &@~` 문법, 캐스트 형태 `(...)::pgroonga_full_text_search_condition`, `pgroonga_score` 와 `ORDER BY` 조합 예제
- [pgroonga_score function](https://pgroonga.github.io/reference/functions/pgroonga-score.html). `(tableoid, ctid)` 시그니처 권장, 인덱스 스캔이 아니면 `0.0` 반환
- [pgroonga_query_escape function](https://pgroonga.github.io/reference/functions/pgroonga-query-escape.html). Since 1.1.9. query syntax 특수문자 이스케이프
- [CREATE INDEX USING pgroonga](https://pgroonga.github.io/reference/create-index-using-pgroonga.html). `WITH (tokenizer=, normalizers=, token_filters=)` 옵션, 기본값 `TokenBigram` / `NormalizerAuto`, 멀티컬럼 인덱스
- [pgroonga_snippet_html function](https://pgroonga.github.io/reference/functions/pgroonga-snippet-html.html). `text[]` 반환, `<span class="keyword">` 래핑, 평문 변형 없음
- [PGroonga reference](https://pgroonga.github.io/reference/). 연산자·함수 목록. `&^~` 는 일본어 로마자·가나 prefix 검색

Supabase

- [PGroonga: Multilingual Full Text Search](https://supabase.com/docs/guides/database/extensions/pgroonga). 확장 활성화, 인덱스 생성 문법, 공백 분리 질의가 AND로 동작하는 예제
- [PostgreSQL Extensions on Supabase (2026)](https://1bench.dev/extensions/postgresql/on-supabase). pgroonga·pg_trgm·unaccent·rum·vector가 PG17·PG15에서 사용 가능
- [Full Text Search](https://supabase.com/docs/guides/database/full-text-search). `to_tsvector` + generated column + GIN 권장 경로. CJK 관련 안내는 없다

대안 검토 근거

- [pg_search: Elastic-Quality Full Text Search Inside Postgres](https://www.paradedb.com/blog/introducing-search). AWS RDS·Supabase·Neon의 기본 확장 allow-list에 pg_search 없음
- [ParadeDB로 구현하는 PostgreSQL 한글 전문 검색과 BM25 성능 비교](https://www.mimul.com/blog/paradedb-korean/). 한국어 tsvector의 한계와 mecab-ko 의존
- [PostgreSQL에서 LIKE 검색 속도를 높여주는 pg_trgm 활용해보기](https://yahwang.github.io/posts/80). trigram이 3글자 미만 질의에서 인덱스 효율이 떨어지는 이유
- [Elastic Cloud Pricing 2026](https://monitoringcost.com/elastic-pricing), [Elasticsearch Pricing 2026](https://comparedge.com/tools/elasticsearch/pricing). 관리형 최소 $99/월, 영구 무료 플랜 없음
- [Algolia Pricing](https://www.algolia.com/pricing). Build 무료 플랜 월 10,000 search request
- [Search Pricing Comparison 2026](https://www.buildmvpfast.com/api-costs/search). Meilisearch Cloud $30/월, Typesense Cloud $29.99/월

Postgres 일반

- [All Your GUCs in a Row: enable_seqscan](https://thebuild.com/blog/all-your-gucs-in-a-row-enable_seqscan/). 전역·세션 단위로 끄면 안 되는 이유. 이 계획은 함수 단위로만 적용한다
- [Fixing the Postgres Query Planner with enable_seqscan = off](https://aaronoellis.com/articles/postgres-enable-seqscan-off). 작은 테이블에서 플래너가 인덱스를 무시하는 동작

Next.js

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md` (Next 16.3.0 동봉 문서). `params`·`searchParams` 를 await하지 않고 Suspense 하위로 promise를 넘기는 규칙

저장소 내 대조 지점

- `supabase/migrations/20260815060100_rls.sql:5` `public.is_admin()` 정의와 8개 테이블의 정책 형태
- `supabase/migrations/20260815130000_match_rag_chunks.sql` 함수 단위 `set search_path`, `operator(extensions....)` 수식, `revoke`·`grant` 관례
- `src/lib/cache/revalidate-failure-store.ts` 실패 저장 구조
- `src/lib/text/token-match.ts` `matchedTokenRatio` 의 부분 문자열 크레딧 규칙

측정

- 2026-08-16, `curl` 로 `https://sungjoon.works/api/search-index`, `/api/search-body?q=검색` 직접 호출
