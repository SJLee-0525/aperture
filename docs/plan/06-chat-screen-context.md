# 챗봇 화면 문맥 인식 계획

> 상태: **구상 / 착수 전**
> 관련 결정: [ADR-0001 Route Handler 기반 Portfolio RAG](../adr/0001-serverless-rag.md)
> 참고: [04-webmcp-agent-tools](04-webmcp-agent-tools.md)
> 목적: 챗봇이 현재 화면을 이해하고, 사진 필터와 연락 초안을 기존 웹 기능으로 이어 준다.

## 결론

내장 챗봇은 WebMCP를 사용하지 않는다. WebMCP API를 호출하지 않고, WebMCP 지원 여부도 확인하지
않는다. 이번 작업으로 기존 WebMCP 도구나 등록 구조를 수정하지도 않는다.

챗봇은 서버의 공개 포트폴리오 데이터와 RAG를 이미 사용한다. 현재 화면은 URL에서 읽을 수 있다.
사진 필터는 URL로 표현하고, 연락 초안은 `sessionStorage`로 연락 페이지에 전달한다. 이 세 작업에
WebMCP가 필요한 지점은 없다.

WebMCP는 외부 브라우저 에이전트용으로 유지한다. 외부 에이전트는 이 사이트의 RAG를 사용할 수
없으므로 `search_portfolio`, `get_*`, `filter_photos` 같은 도구가 필요하다. 내장 챗봇과 대상이
다르다.

이번 계획에서 하지 않는 일은 다음과 같다.

- 챗봇에서 `getTools` 또는 `executeTool` 호출
- `/api/chat`을 WebMCP 도구로 공개
- WebMCP 도구 카탈로그나 훅 구조 개편
- 사진 필터를 실행하는 별도 런타임 액션 레지스트리 도입
- 연락 폼 자동 제출

## 1. 화면 문맥 읽기

### 현재 문제

사진 모달을 열어둔 채 "이거 어디서 찍었어?"라고 물으면 챗봇은 어느 사진인지 모른다. "이
프로젝트 기술 스택이 뭐야"나 "지금 보고 있는 연주 프로그램 알려줘"도 마찬가지다.

상세 모달은 URL query를 상태의 단일 출처로 쓴다. 공개 레이아웃의 챗봇 패널에서
`usePathname()`과 `useSearchParams()`를 읽어 요청에 포함한다.

```ts
type ChatContextTarget = "photo" | "work" | "award" | "project";

type ChatContext = {
  pathname: string;
  openTarget?: { type: ChatContextTarget; id: string };
  photoFilters?: {
    tag?: string;
    camera?: string;
    focalMin?: number;
    focalMax?: number;
  };
};
```

첫 구현에서는 `pathname`과 `openTarget`만 보낸다. `photoFilters`는 2단계에서 필터를 URL로 옮긴
뒤 추가한다.

### 화면 문맥 전용 resolver

화면 문맥은 채팅 레퍼런스와 별도로 해석한다. 현재 `formatProfileReferences`는 사진, 연주,
프로젝트만 다루며 음악 수상은 포함하지 않는다. `award`를 `music` 레퍼런스로 바꾸면 같은 id의
연주를 찾게 되므로 기존 `resolveProfileReferences`를 재사용할 수 없다.

서버에 `resolveChatScreenContext`를 둔다.

```ts
resolveChatScreenContext({
  pathname,
  target: { type: "award", id },
});
```

resolver는 공개 데이터에서 id를 다시 찾고 프롬프트에 넣을 짧은 문맥을 만든다.

| 화면 대상 | query key   | 데이터        | 프롬프트에 넣을 내용         |
| --------- | ----------- | ------------- | ---------------------------- |
| `photo`   | `?photo=`   | `photos`      | 제목, 장소, 장비, EXIF       |
| `work`    | `?work=`    | `musicWorks`  | 제목, 날짜, 장소, 프로그램   |
| `award`   | `?award=`   | `musicAwards` | 연도, 수상명, 장소           |
| `project` | `?project=` | `devProjects` | 제목, 요약, 기술, 역할, 성과 |

트러블슈팅 전문처럼 긴 필드는 기본 화면 문맥에서 제외한다. 사용자의 질문이 해당 내용을 요구하면
기존 RAG 검색이 보강한다.

### 요청과 서버 검증

클라이언트가 보낸 값은 프롬프트에 바로 넣지 않는다.

- 허용된 공개 경로만 받는다. 로케일은 `ko`와 `en`만 허용한다.
- 경로에 맞는 query key 하나만 사용한다. `/ko/dev/projects`에서 받은 `photo`는 버린다.
- id는 문자열만 받고 64자로 제한한다. 제목, 본문, 이미지 URL은 클라이언트에서 받지 않는다.
- id가 공개 데이터에 없으면 화면 문맥 없이 기존 채팅 흐름을 계속한다.
- 태그와 카메라는 공개 데이터에서 만든 목록과 대조한다.
- 초점거리는 갤러리와 같은 범위로 제한하고 역전된 범위는 거부한다.
- 클라이언트의 `ChatContext`와 서버가 만든 프롬프트 문맥에 각각 크기 상한을 둔다.
- 화면 문맥 원문은 서버 로그, Sentry 이벤트, 분석 이벤트에 기록하지 않는다.

현재 요청 본문은 20KB로 제한된다. `ChatContext`에는 별도의 작은 상한을 두고, resolver 출력은
대상 하나당 1,500자를 넘기지 않는다.

### 전송 시점

문맥은 질문을 보낼 때마다 현재 URL에서 새로 만든다. 메시지 기록에는 복사하지 않는다. 재시도할
때도 저장된 문맥을 재사용하지 않고 그 시점의 URL을 다시 읽는다. 사용자가 모달을 바꾼 뒤 재시도한
경우 현재 화면을 기준으로 답해야 하기 때문이다.

문맥은 항상 보내되 값이 없으면 `openTarget`과 `photoFilters`를 생략한다. 클라이언트에서 지시어를
판별하면 언어별 예외가 늘고, 잘못 생략했을 때 서버가 복구할 방법이 없다.

### 테스트

- 사진, 연주, 음악 수상, 프로젝트의 정상 id를 각각 해석한다.
- 경로와 맞지 않는 target, 64자를 넘는 id, 존재하지 않는 id를 버린다.
- `ko`와 `en` 경로에서 같은 항목을 현재 언어로 투영한다.
- 여러 modal key가 있어도 현재 경로에 맞는 대상 하나만 쓴다.
- 문맥이 없어도 기존 채팅 응답이 달라지지 않는다.
- 재시도 시 저장된 값이 아니라 현재 URL을 다시 읽는다.

## 2. 사진 필터를 URL로 이전

현재 `q`만 URL에 있고 태그, 카메라, 초점거리는 `usePhotoFilter`의 `useState`에 있다. 필터를 URL로
옮기면 공유, 새로고침 복원, 뒤로가기가 가능해진다. 챗봇도 현재 필터를 읽거나 필터 링크를 줄 수
있다.

### URL 계약

허용하는 query parameter는 다음과 같다.

| parameter  | 값                              | 기본값 처리      |
| ---------- | ------------------------------- | ---------------- |
| `q`        | 검색 문자열                     | 빈 값은 삭제     |
| `tag`      | 공개 태그 id                    | `all`은 삭제     |
| `camera`   | 공개 사진에 존재하는 카메라명   | `all`은 삭제     |
| `focalMin` | 갤러리 최소·최대 범위 안의 정수 | 전체 범위면 삭제 |
| `focalMax` | 갤러리 최소·최대 범위 안의 정수 | 전체 범위면 삭제 |
| `photo`    | 열린 사진 id                    | 닫히면 삭제      |

canonical 순서는 `q`, `tag`, `camera`, `focalMin`, `focalMax`, `photo`로 고정한다. 알 수 없는
parameter는 보존하지 않는다. 잘못된 태그와 카메라는 버리고, 범위 밖 숫자와 `focalMin > focalMax`도
기본값으로 되돌린다.

필터를 바꿀 때 열린 `photo`는 유지한다. 열린 사진이 새 필터 결과에서 빠져도 모달은 닫지 않는다.
사진 상세 열람과 배경 그리드 필터는 서로 독립적이기 때문이다.

### codec과 훅

파싱과 직렬화는 서버와 클라이언트에서 함께 쓸 수 있는 순수 모듈로 둔다.

```text
src/lib/photo-filter-query.ts
  parsePhotoFilterQuery(searchParams, vocabulary)
  buildPhotoFilterHref(pathname, filters, vocabulary)
```

이 모듈은 React와 `window`에 의존하지 않는다. `usePhotoFilter`는 파싱 결과를 읽고 setter가 URL을
갱신하도록 바꾼다. `FilterBar`의 props 계약과 `filterPhotos`는 유지한다. 필터 결과가 바뀌면 기존
`useInfiniteScroll`이 처음부터 다시 렌더하는지도 확인한다.

히스토리는 입력 성격에 따라 나눈다.

- 태그와 카메라 선택, 필터 초기화는 `push`를 사용한다.
- 초점거리 슬라이더를 움직이는 동안에는 `replace`를 사용한다.
- 슬라이더에 별도 commit 이벤트를 붙인다면 최종 값만 `push`할 수 있다.
- 검색어 `q`는 현재 검색 UI의 정책을 유지한다.

### 챗봇이 주는 필터 링크

새 액션 필드는 만들지 않는다. 모델은 기존 `links` 필드에 사진 페이지 링크 후보를 반환한다. 서버는
`sanitizeLinks`에서 query를 파싱한 뒤 공개 태그·카메라 목록과 숫자 범위를 검증하고 canonical
codec으로 다시 만든다. 검증에 실패하면 링크를 버린다.

모델이 임의 문자열을 반환한다는 사실은 바뀌지 않는다. 서버가 그 문자열을 그대로 전달하지 않는
것이 보안 경계다. 서버가 모델의 본문만 보고 필터 의도를 추론하거나 URL을 새로 만들어 내지는 않는다.

예를 들어 모델이 `/photo?tag=Sea`를 반환하면 서버는 `/photo?tag=sea`로 정리한다. 채팅 패널의
`LocalizedLink`가 렌더할 때 현재 언어를 붙여 `/ko/photo?tag=sea` 또는 `/en/photo?tag=sea`로 만든다.
`/photo?redirect=https://...`나 공개 사전에 없는 카메라명은 통과시키지 않는다.

같은 사진 페이지에서도 링크를 누르면 URL이 갱신된다. 이동 없이 setter를 직접 실행하는 기능은
이번 범위에 없다. 실제 사용에서 이 차이가 불편하다고 확인된 뒤에만 내부 액션을 검토한다.

### 테스트

- 모든 parameter의 파싱, 기본값 생략, canonical 순서를 검사한다.
- 한글·영문 태그 라벨과 id를 같은 공개 태그 id로 정규화한다.
- 카메라명은 정확 일치와 현재 `filter_photos`가 허용하는 유일 부분 일치 규칙을 맞춘다.
- 범위 밖 숫자, `NaN`, 역전된 초점 범위, 중복 parameter를 처리한다.
- 필터 변경 중에도 `q`와 `photo`를 보존한다.
- `push`, `replace`, `popstate`에서 화면 필터와 URL이 일치한다.
- 필터 변경 후 무한스크롤이 처음부터 시작한다.
- 외부 URL, 허용하지 않은 경로와 query key를 `sanitizeLinks`가 제거한다.

## 3. 연락 초안을 `sessionStorage`로 전달

방문자가 채팅에서 이름, 메일, 문의 내용을 이미 말했을 때 연락 페이지에서 다시 입력하게 하지 않는다.
챗봇은 초안을 구조화된 응답으로 보내고, 방문자가 버튼을 누르면 브라우저가 초안을 저장한 뒤 연락
페이지로 이동한다.

이 기능도 WebMCP를 사용하지 않는다. 기존 선언형 `prepare_contact_message`는 외부 에이전트용으로
남겨 두며, 내장 챗봇은 호출하지 않는다.

### 응답 계약

현재 응답 계약에는 초안을 전달할 필드가 없으므로 nullable 필드를 추가한다.

```ts
type ContactDraft = {
  name: string | null;
  email: string | null;
  message: string;
  label: string;
};

type ChatProviderResult = {
  content: string;
  links?: ChatLink[];
  references?: ChatReferenceRequest[];
  contactDraft: ContactDraft | null;
};
```

OpenAI strict schema에서는 `contactDraft`를 항상 required로 두고 없을 때 `null`을 받는다. object가
있다면 `name`, `email`, `message`, `label`도 모두 required이며 선택값은 nullable로 표현한다.
Gemini도 같은 응답 계약을 사용한다.

서버 파서는 문자열 길이, 이메일 형식과 빈 메시지를 검사한다. 검증에 실패하면 `contactDraft`를
버리고 본문만 전달한다. 이름이나 메일이 아직 없더라도 메시지가 있으면 초안을 허용하고 연락 페이지의
나머지 칸은 방문자가 채운다.

### 저장과 이동

응답을 받자마자 저장하지 않는다. 챗봇 메시지에 "연락 페이지에서 이어 쓰기" 버튼을 표시하고,
방문자가 눌렀을 때만 `sessionStorage`에 쓴다.

```ts
type StoredContactDraftV1 = {
  version: 1;
  createdAt: number;
  expiresAt: number;
  name: string;
  email: string;
  message: string;
};
```

storage key는 버전을 포함한 상수 하나로 관리한다. 만료 시간은 짧게 두고, 연락 페이지는 다음 순서로
읽는다.

1. 값을 읽자마자 storage에서 삭제한다.
2. JSON, version, 만료 시간과 필드 길이를 검증한다.
3. 유효한 필드만 폼의 초기값으로 넣는다.
4. 입력 칸을 채운 뒤 첫 번째 비어 있는 필드로 초점을 옮긴다.

`sessionStorage.getItem`, `setItem`, `removeItem`은 `SecurityError`를 던질 수 있으므로 모두
`try/catch`로 감싼다. 저장에 실패하면 초안을 잃었다고 표시하지 않고 일반 `/contact` 링크로 이동한다.
새 탭에서는 같은 storage를 기대하지 않는다. 버튼은 현재 탭에서 이동한다.

연락 폼은 현재 uncontrolled input을 사용하므로, 초안을 읽는 시점과 DOM에 값을 넣는 방식을 구현
전에 확인한다. React 상태로 폼 전체를 바꾸지 않고 `defaultValue`용 초기 draft를 상위에서 전달하거나
각 input ref에 한 번만 반영하는 방법을 우선 검토한다. WebMCP 선언형 폼이 input을 찾을 수 있도록
기존 `name`, `required`, submit 구조는 유지한다.

### 개인정보 처리

초안은 이미 사용자가 채팅에 입력한 개인정보다. 흔적이 전혀 남지 않는다고 설명하지 않는다. 추가
저장 범위와 수명을 제한한다.

- 기존 사용자 메시지 외에 서버나 외부 저장소에 초안을 따로 저장하지 않는다.
- 서버 로그, Sentry breadcrumb, 분석 이벤트에 `contactDraft` 값을 넣지 않는다.
- 연락 페이지는 storage 값을 읽은 직후 삭제한다. 파싱에 실패해도 삭제한다.
- 만료된 값은 폼에 넣지 않는다.
- 이메일과 메시지를 assistant 본문이나 버튼 label에 다시 출력하지 않는다.
- 캡차 확인과 발송은 방문자가 직접 한다.
- 개인정보 처리방침에 탭 단위 임시 저장 목적과 삭제 시점을 반영할지 확인한다.

채팅 메시지 자체에는 사용자가 입력한 내용이 남는다. 이번 규칙은 같은 값을 별도 저장소와 로그에
추가로 복제하지 않는다는 뜻이다.

### 테스트

- strict schema의 `null`, 전체 초안, 이름·메일이 없는 부분 초안을 파싱한다.
- 잘못된 이메일, 빈 메시지, 길이 초과 값을 거부한다.
- 버튼을 누르기 전에는 storage에 쓰지 않는다.
- 버튼 클릭 시 저장 후 현재 탭에서 `/contact`로 이동한다.
- 정상 값, 만료 값, 잘못된 JSON, 알 수 없는 version을 각각 처리한다.
- 읽기와 파싱 성공 여부에 관계없이 storage 값을 삭제한다.
- storage API가 예외를 던지면 일반 연락 링크로 이동한다.
- 초안으로 폼을 채워도 WebMCP 선언형 폼 등록과 수동 입력이 그대로 동작한다.
- 초안을 채운 뒤에도 캡차와 전송 버튼을 거치며 자동 제출하지 않는다.

## 4. 비용과 응답 실패 처리

| 모델                  | 역할   | Structured Outputs |
| --------------------- | ------ | ------------------ |
| Gemini 3.5 Flash-Lite | 메인   | 지원               |
| GPT-5.6 Luna          | 폴백   | 지원 (strict)      |
| GPT-5 Nano            | 전처리 | 지원               |

화면 문맥과 사진 필터 URL은 모델 호출 횟수를 늘리지 않는다. `contactDraft`도 기존 응답에 필드 하나를
추가할 뿐이다. 새 API 키는 필요 없다.

요청의 `ChatContext`는 100토큰보다 작지만, resolver가 만든 화면 문맥은 수백 토큰이 될 수 있다.
따라서 전송 객체와 프롬프트 문맥의 크기를 따로 제한한다.

출력이 잘려 JSON이 깨지면 기존 partial JSON salvage가 본문만 회수한다. `links`, `references`,
`contactDraft`는 버린다. 초안이 일부만 복구되어 잘못된 개인정보가 폼에 들어가는 것보다 본문만
보여주는 편이 안전하다.

## 5. 구현 순서

1. `ChatContext` 요청 파서와 `resolveChatScreenContext`를 구현한다.
2. 화면 문맥을 서버 프롬프트에 넣고 사진, 연주, 음악 수상, 프로젝트 지시어를 평가한다.
3. 사진 필터 query codec과 URL 기반 `usePhotoFilter`를 구현한다.
4. `sanitizeLinks`에 사진 필터 query 검증과 canonical 직렬화를 추가한다.
5. 채팅 응답에 nullable `contactDraft`를 추가한다.
6. 챗봇 버튼, storage 어댑터, 연락 폼 초기값 적용을 구현한다.
7. 개인정보 처리방침 반영 여부를 확인하고 단위·E2E 테스트를 실행한다.

각 단계는 WebMCP 없이 구현하고 검증한다. 기존 WebMCP 테스트는 회귀 확인용으로만 실행한다.

## 6. 완료 기준

- 열린 사진, 연주, 음악 수상, 프로젝트를 가리키는 질문에 현재 화면 기준으로 답한다.
- 잘못된 경로, id와 필터 값은 프롬프트나 링크에 들어가지 않는다.
- 사진 필터 URL이 공유, 새로고침, 뒤로가기에서 정한 정책대로 동작한다.
- 챗봇이 만든 사진 링크는 서버 검증과 canonical codec을 통과한다.
- 연락 초안은 방문자가 버튼을 눌렀을 때만 저장된다.
- 연락 페이지는 초안을 한 번만 읽고 storage에서 삭제한다.
- storage를 사용할 수 없는 환경에서도 일반 연락 링크가 동작한다.
- 캡차와 발송은 자동으로 실행되지 않는다.
- WebMCP 미지원 브라우저에서도 세 기능이 모두 동작한다.
- 기존 WebMCP 도구의 등록과 실행 결과가 바뀌지 않는다.
- typecheck, lint, unit, E2E가 통과한다.
