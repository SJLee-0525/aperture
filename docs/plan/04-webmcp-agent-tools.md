# WebMCP 에이전트 도구 구현 계획

> 상태: **W1~W5 완료 · WebMCP 16개 표면 검증 완료** (2026-08-11, 블로그 도구 추가 검증 포함)
> 처음 구현한 명령형 도구 13종과 선언형 연락 폼 1종을 5차 평가까지 검증했고, 이후 블로그 도구
> 2종도 확인했다. 실행 기록과 수정 내역은
> [webmcp-tool-eval](../troubleshooting/webmcp-tool-eval.md)에 정리했다.
> 결정 근거: [ADR-0003](../adr/0003-webmcp-agent-tools.md)
> 관련 결정: [ADR-0002 경로 기반 i18n](../adr/0002-path-based-i18n.md), [03-browser-language-entry-routing](03-browser-language-entry-routing.md)
> 목적: 방문자가 데려온 브라우저 에이전트가 공개 포트폴리오를 DOM 추론이 아니라 도구 호출로 탐색하게 한다.

## 1. 범위

Chrome WebMCP 오리진 트라이얼(Chrome 149+)을 사용해 공개 페이지에 읽기 중심 도구를 등록한다.
명령형 API(`document.modelContext`)로 섹션 도구를 등록하고, 선언형 API로 연락 폼 하나를 노출한다.

다음은 범위에 넣지 않는다.

- 관리자 CMS 도구와 모든 쓰기 도구
- 교차 출처 노출(`exposedTo`)
- 챗봇(`/api/chat`) 연동
- 도구 전용 데이터 소스나 별도 API

## 2. 구조

```text
공개 layout (client boundary)
    └─ useGlobalTools()          search_portfolio · get_profile
페이지 client component
    └─ use<Section>Tools(props)  마운트 동안만 등록, unmount 시 abort
            ↓
    lib/webmcp/model-context.ts  document.modelContext 접근 유일 지점
            ↓
    document.modelContext.registerTool(...)
```

```text
src/lib/webmcp/
├── model-context.ts        # 벤더 어댑터: 기능 감지 + /admin 가드 + registerTool 래핑
├── tool-output.ts          # 1,500자 예산 직렬화 (clampLimit·formatToolList·clampToolText)
├── tool-schemas.ts         # 공유 JSON Schema 조각
└── origin-trial-token.ts   # NEXT_PUBLIC 토큰 빌드타임 상수

src/hooks/
└── use-model-context-tool.ts   # 등록/해제 공유 훅 (6개 feature 가 사용)

src/features/webmcp/            # 전역 도구만. 섹션 도구는 각 소유 feature 에 있다
├── _hooks/use-global-tools.ts  # search_portfolio · get_profile
└── _components/{WebMcpTools,WebMcpGlobalTools}.tsx   # 기능 감지 게이트 + dynamic 청크

# 섹션별 도구 훅. eslint boundaries 규칙(feature 간 직접 import 금지)에 따라
# 도구가 조작하는 데이터·상태를 소유한 feature 의 _hooks/ 에 둔다.
src/features/gallery/_hooks/use-gallery-tools.ts   # /photo
src/features/albums/_hooks/use-album-tools.ts      # /photo/albums
src/features/map/_hooks/use-map-tools.ts           # /photo/map
src/features/dev/_hooks/use-dev-tools.ts           # /dev/projects
src/features/music/_hooks/use-music-tools.ts       # /music · /music/career
```

어댑터를 한 파일로 두는 이유는 진입점이 이미 `navigator.modelContext`에서
`document.modelContext`로 한 번 옮겨갔기 때문이다. 스펙이 또 바뀌면 이 파일만 고친다.
훅과 도구 정의는 이 파일의 타입만 본다. `/admin` 가드도 이 파일(모든 등록의 단일
통과점)에 있다. admin은 로케일 밖 경로이므로 프리픽스를 벗겨낼 필요 없이 `startsWith`로 검사한다.

## 3. 도구 목록

이름·설명·스키마는 영어로 고정하고, 출력 텍스트는 현재 로케일을 따르며, 경로에는 `localizePath`를 적용한다.

| 도구                   | 스코프          | readOnlyHint | 입력                                        | 출력                             |
| ---------------------- | --------------- | ------------ | ------------------------------------------- | -------------------------------- |
| `search_portfolio`     | 전역            | true         | `query`, `section?`, `limit?`               | 상위 N건 제목·섹션·경로          |
| `get_profile`          | 전역            | true         | `section?` (photo/music/dev/all)            | 소개 + 섹션별 하위 페이지 지도   |
| `filter_photos`        | `/photo`        | false        | `tag?`, `camera?`, `focalMin?`, `focalMax?` | 활성 필터 + 건수 + 상위 항목(id) |
| `get_photo_details`    | `/photo`        | true         | `photoId?`(생략=열린 사진)                  | 제목·장소·장비·EXIF 요약         |
| `open_photo`           | `/photo`        | false        | `photoId`                                   | 연 사진 제목 (모달 열림)         |
| `list_albums`          | `/photo/albums` | true         | `limit?`                                    | 앨범 제목·부제·장수·경로         |
| `list_photo_locations` | `/photo/map`    | true         | `limit?`                                    | 장소별 촬영 수(내림차순)·좌표    |
| `list_projects`        | `/dev/projects` | true         | `tech?`, `year?`, `limit?`                  | 제목·요약·경로                   |
| `get_project`          | `/dev/projects` | true         | `projectId?`(생략=열린 항목)                | 요약·성과(수상)·스택·딥링크      |
| `open_project`         | `/dev/projects` | false        | `projectId`                                 | 연 프로젝트 제목 (모달 열림)     |
| `list_music_works`     | `/music`        | true         | `category?`, `limit?`                       | 제목·부제·공연일·경로            |
| `get_music_work`       | `/music`        | true         | `workId?`(생략=열린 항목)                   | 프로그램·장소·예매 링크          |
| `list_music_awards`    | `/music/career` | true         | `limit?`                                    | 연도·수상명                      |

전체는 13개지만 한 페이지에서 동시에 보이는 도구는 전역 2개와 페이지 스코프 1~3개를 합쳐
최대 5개다(/photo·/dev/projects 가 5개, 나머지는 그 이하). 도구 수가 늘면 에이전트의 선택
정확도가 떨어질 수 있어 이 상한을 유지한다. 전역 도구를 특정 페이지로 좁히면 최대 도구 수는
4개가 되지만, 어느 페이지에서든 검색과 프로필 조회가 가능해야 하므로 적용하지 않았다.

`get_*`와 `open_*`는 의도적으로 분리했다. 에이전트는 정보만 필요한 경우와 사용자에게 화면을
보여줘야 하는 경우를 도구 선택으로 구분할 수 있어야 한다. 하나로 합치면 조회할 때마다 모달이
열려 화면이 튄다. `open_*`은 URL query만 바꾸므로 기존 모달 훅(`use-photo-detail-session` 등)을
그대로 재사용한다.

## 4. 데이터 소스

| 도구 계층          | 소스                              | 추가 비용                     |
| ------------------ | --------------------------------- | ----------------------------- |
| 페이지 스코프      | 서버가 내려준 props (`photos` 등) | 없음                          |
| `search_portfolio` | `/api/search-index` (ISR 1시간)   | 세션당 최대 1회 fetch, 재사용 |
| `get_profile`      | `site` config props               | 없음                          |

페이지 스코프 도구는 서버가 이미 내려준 props를 사용한다. WebMCP만을 위한 별도 데이터 요청이나
큰 필드의 추가 직렬화는 피한다. 예외가 필요하면 증가분을 측정하고 이 문서에 근거를 남긴다.

검색 랭킹은 `src/lib/search/rank-documents.ts`를 쓴다. 이 함수는 `score-documents.ts` 채점기를
기반으로 하며 자동완성의 `suggest-documents.ts`와 공유된다. 사진 필터는
`features/gallery/_lib/filter-photos.ts`를 호출한다. UI와 도구가 같은 함수를 쓰므로 같은 조건에는
같은 결과가 나온다.

## 5. 출력 규약

```ts
// lib/webmcp/tool-output.ts
const TOOL_OUTPUT_BUDGET = 1500; // 문서 권장치
const DEFAULT_LIST_LIMIT = 8;
```

- 목록 항목은 `제목 · 메타 · 경로` 한 줄로 직렬화한다. 예산을 넘으면 잘라내고 `+N more`로 알린다.
- 상세 도구는 원문(overview·troubleshooting 전문)을 넣지 않는다. 요약과 경로를 주고, 전문이
  필요하면 에이전트가 해당 경로로 이동하게 한다.
- 실패는 예외가 아니라 문장으로 반환한다. `No photo matches that id.`처럼 다음 행동이 보이게 쓴다.
- `execute`는 문자열을 반환한다. 페이지 이동을 유발하는 도구는 `null`이 반환된다는 점을 전제한다.

## 6. i18n과 경로

- 도구 이름·설명·파라미터 설명은 영어로 고정하고 코드로 취급한다.
- 출력 콘텐츠는 `useLang()`의 현재 언어로 `pickText`를 거친다.
- 반환 경로는 `localizePath(lang, ROUTES.X)`로 만들어 `/ko/photo?photo=id` 형태의 로케일
  프리픽스를 유지한다. 프리픽스 없는 경로를 반환하면 에이전트가 `/ko/*` 직행 308이나 루트 `/`의
  조건부 307 판정을 타면서 방문자가 보고 있던 언어와 어긋날 수 있다. 라우팅 정책은
  [03-browser-language-entry-routing](03-browser-language-entry-routing.md)을 따른다.

## 7. 보안

ADR-0003의 결정을 구현 항목으로 옮겼다.

- `/admin/*`에는 도구를 마운트하지 않는다. 어댑터(`registerWebMcpTool`)가 모든 등록의 단일
  통과점에서 경로를 확인해 한 번 더 막는다.
- `exposedTo`를 지정하지 않아 동일 출처로 두고, `security-headers.ts`의 `Permissions-Policy`에
  `tools=(self)`를 추가한다.
- 조회 도구는 `readOnlyHint: true`, 필터·모달 도구는 `false`로 표시한다. 공개 콘텐츠 작성자가
  관리자 1명뿐이므로 전 도구 `untrustedContentHint: false`로 두되, 방문자 생성 콘텐츠를 도입하는
  시점에 즉시 재검토한다.
- 연락 폼은 선언형 속성만 붙이고 `toolautosubmit`은 쓰지 않는다. `submit` 리스너에서
  `event.agentInvoked`로 에이전트 호출을 구분해 캡차 미해결 안내를 `respondWith`로 돌려준다.
- `:tool-form-active`와 `:tool-submit-active`로 에이전트가 폼을 조작 중임을 시각적으로 드러낸다.
  CSS Modules 파이프라인(Turbopack)이 비표준 의사클래스에 경고를 내므로, 이 두 rule 은 모듈
  CSS 가 아니라 ContactForm 의 런타임 `<style>` 주입으로 둔다(빌드 경고 0 유지).

## 8. 환경변수

```dotenv
NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL_TOKEN=
```

`app/layout.tsx`가 값이 있을 때만 `<meta http-equiv="origin-trial">`를 넣는다. 실값은 Vercel에만
둔다. 로컬 검증은 토큰 없이 `chrome://flags/#enable-webmcp-testing` 활성화로 대체한다.
별도 기능 플래그는 두지 않는다. 토큰을 지우면 트라이얼이 꺼지고 API가 사라진다.

## 9. 단계

1. W1 기반: 어댑터, `use-model-context-tool`, 전역 도구 2종, 오리진 트라이얼 meta 배선,
   `tools=(self)` 헤더. 이 단계까지가 회귀 위험이 사실상 0인 구간이다.
2. W2 사진: `filter_photos`, `get_photo_details`, `open_photo`, `list_albums`,
   `list_photo_locations`. 기존 필터·모달 훅 재사용 여부를 여기서 검증한다.
3. W3 개발·음악: 프로젝트 3종, 연주·수상 3종.
4. W4 연락 폼: 선언형 속성, `agentInvoked` 분기, 포커스 표시 CSS.
5. W5 평가: Tool Inspector로 시나리오를 점검하고 문서화한다. 실패하면 도구 설명과 스키마를 고친다.

## 10. 테스트

- 단위(결정론): 가짜 `document.modelContext`를 주입해 등록된 스키마, `execute` 반환값,
  unmount 시 등록 해제, 로케일별 경로·텍스트, 출력 예산 절단을 검증한다.
- 미지원 브라우저: `modelContext`가 없을 때 훅이 아무것도 하지 않고 렌더 결과가 동일함을 확인한다.
- E2E: 범위 밖이다. 공개 E2E는 기존 계약(CONTEXT.md)만 유지하며 WebMCP는 검사하지 않는다.
- 수동 평가: Model Context Tool Inspector로 evals 문서가 지목한 네 가지 실패 모드를 점검한다.
  잘못된 도구 선택, 잘못된 순서, 잘못된 인자, 불충분한 출력이다. 결과가 확률적이므로 CI에 넣지 않는다.

평가 시나리오 예:

| 발화                            | 기대 호출                                        |
| ------------------------------- | ------------------------------------------------ |
| "이 사람 React 프로젝트 보여줘" | `list_projects({tech:"React"})` → `open_project` |
| "필름 카메라로 찍은 사진만"     | `filter_photos({camera:...})`                    |
| "피아노 리사이틀 언제 했어?"    | `list_music_works({category:"recital"})`         |
| "이 사진 어디서 찍었어?"        | `get_photo_details` (`open_photo` 아님)          |
| "연락하고 싶어"                 | 연락 폼 prefill, 제출은 사람                     |

### W5 수동 평가 결과 (2026-08-11)

Model Context Tool Inspector로 위 시나리오 5종을 프로덕션에서 실행했다. 첫 평가에서는 로직 결함
1건을 찾았다. 다른 실패는 도구가 사용 가능한 값이나 현재 화면 상태를 충분히 설명하지 않아
발생했다. 전체 실행 기록과 후속 평가는
[webmcp-tool-eval](../troubleshooting/webmcp-tool-eval.md)에 남겼다.

| 시나리오              | 관찰                                                                                  | 조치                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| React 프로젝트        | `tech:"React"` 실패 → 에러의 태그 목록 보고 `"React.js"` 로 자가 복구                 | 스키마 예시를 실데이터(`React.js`)로 교체 + `.js` 접미사 정규화                      |
| 필름 카메라 사진      | 어떤 카메라가 있는지 몰라 `filter_photos` 대신 검색으로 우회                          | 인자 없이 호출하면 사용 가능한 태그·카메라 목록 반환                                 |
| 피아노 리사이틀       | `/music`이 아니어서 `list_music_works` 미등록(설계대로) + 데이터에 해당 카테고리 없음 | 조치 없음. 페이지 스코프는 의도한 동작                                               |
| 이 사진 어디서 찍었어 | 열린 사진을 몰라 대화 기록의 낡은 id를 사용해 다른 사진을 설명함                      | `photoId`·`projectId`·`workId`를 선택 인자로 바꾸고, 생략 시 열린 모달을 대상으로 함 |
| 연락하고 싶어         | 어느 도구도 `/contact` 경로를 알려주지 않아 막다른 길                                 | `get_profile` 출력에 연락 경로 상시 포함                                             |

5차 평가에서 명령형 도구 13종과 선언형 연락 폼을 모두 확인했다. 코드 재검증 대기 항목은 없다.

평가 도구의 무료 모델 쿼터(분당 5회)에 걸리기 쉬우므로 시나리오는 한 번에 하나씩 돌린다.
페이지 스코프 도구는 해당 페이지를 연 뒤 평가해야 한다.

## 11. 완료 기준

- 미지원 브라우저에서 공개 페이지 동작과 렌더 결과가 변하지 않는다.
- `/admin/*`에서 도구가 하나도 등록되지 않는다.
- 도구가 Firestore 읽기나 `/api/chat` 호출을 추가하지 않는다.
- 모든 도구 출력이 1,500자 예산 안에 들어오고 목록이 조용히 잘리지 않는다(`+N more` 명시).
- 반환 경로가 현재 로케일 프리픽스를 유지한다.
- 도구 결과가 같은 조건의 화면 결과와 일치한다(공유 `_lib` 함수 사용).
- 연락 폼이 에이전트 호출만으로 발송되지 않는다.
- typecheck, lint, unit, production build가 통과한다.

## 12. 초안에서 달라진 점

구현하면서 초안의 일부를 다음과 같이 바꿨다.

- `get_photo_details` 출력에 촬영일이 없다. `GalleryPhoto` 투영에 `shotAt`이 없기 때문이다.
- `get_project`는 카드 투영의 요약·성과·기술·경로를 반환한다. 담당 업무와 트러블슈팅 전문은
  `open_project`로 유도한다.
- `DevProjectCardData`에 `techTags`와 `achievements`를 추가했다. §4의 직렬화 원칙에 둔 두 번의
  예외다.
  - `techTags` — 기술 필터는 텍스트 부분일치보다 `list_projects({tech})`의 정확 매칭이 적합하다.
    평면 문자열 배열이라 증가분이 수백 바이트다.
  - `achievements` — `get_project`가 성과·수상을 답하려면 필요하다. 8개 프로젝트 기준 RSC
    payload 증가는 **약 7.7KB**다(2026-08-11, 같은 측정 기준의 페이지 문서 86.9KB 대비 8.9%).
    별도 fetch로 바꾸면 실패 경로와 캐시 미스 지연, 상세 모달과의 중복 조회가 생기므로 현재
    규모에서는 직렬화 비용을 감수한다. **재검토 조건**: achievements 직렬화가 25KB를 넘거나
    문서 payload의 15% 이상이 되면 같은 방식으로 다시 측정한다.
- 섹션 도구 훅은 `features/webmcp`가 아니라 각 소유 feature의 `_hooks/`에 있다.
  eslint boundaries 규칙이 feature 간 직접 import를 막기 때문이다. 공유 등록 훅은 `src/hooks/`,
  스키마 조각은 `src/lib/webmcp/` 로 승격했다.
- 페이지당 도구 상한은 4가 아니라 5다(§3). 전역 도구를 모든 공개 페이지에 유지하기로 했다.
- 상세 도구 3종의 id는 선택값이다. 생략하면 현재 열린 모달을 대상으로 삼는다.
  화면 상태를 읽지 않으면 에이전트가 낡은 id 를 채워 넣는다(W5 평가에서 실제 발생).
- 연락 폼의 에이전트 제출은 캡차 토큰과 관계없이 막는다. `agentInvoked` 분기가 `respondWith`로
  다음 행동을 알리고 발송 없이 끝낸다.

## 13. 열린 질문

- 오리진 트라이얼 종료 후 정식 출시 전까지 배포 상태를 유지할지, 토큰만 비워둘지.
- 방명록·좋아요 등 방문자 쓰기가 생기면 `untrustedContentHint`와 함께 쓰기 도구 정책을 다시
  정해야 한다.

## 14. 근거 문서

- [WebMCP 개요](https://developer.chrome.com/docs/ai/webmcp):
  제안 상태, 오리진 트라이얼(Chrome 149+)과 로컬 플래그, 브라우징 컨텍스트 필수 등 제한사항
- [명령형 API](https://developer.chrome.com/docs/ai/webmcp/imperative-api):
  `registerTool`/`getTools`/`executeTool` 시그니처, AbortSignal 등록 해제,
  `navigator.modelContext`에서 `document.modelContext`로의 이동(Chrome 150+)
- [선언형 API](https://developer.chrome.com/docs/ai/webmcp/declarative-api):
  `toolname`·`tooldescription`·`toolautosubmit` 속성, `SubmitEvent.agentInvoked`와
  `respondWith`, `:tool-form-active`·`:tool-submit-active` 의사클래스
- [권장사항](https://developer.chrome.com/docs/ai/webmcp/best-practices):
  도구당 단일 기능, 즉시 실행과 프로세스 시작을 구분하는 네이밍, 부정형 대신 긍정형 설명
- [보안 가이드](https://developer.chrome.com/docs/ai/webmcp/secure-tools):
  간접 프롬프트 인젝션 위협 모델, `readOnlyHint`·`untrustedContentHint` 적용 기준,
  `exposedTo` 제한 원칙, 문자 예산(설명 500자·파라미터 150자·이름 30자·출력 1,500자)
- [MCP와의 비교](https://developer.chrome.com/docs/ai/webmcp/compare-mcp):
  탭 바인딩 일시성과 DOM 인식이라는 WebMCP의 위치, MCP와의 하이브리드 권장
- [평가 방법](https://developer.chrome.com/docs/ai/webmcp/evals):
  네 가지 실패 모드와 결정론·확률론 테스트 분리 전략
- [사용 사례](https://developer.chrome.com/docs/ai/webmcp/use-cases):
  검색·폼 완성·정보 필터링 시나리오와 도구 설계 예
- [오리진 트라이얼 등록](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241):
  프로덕션 도메인 토큰 발급
- [Chrome Status: WebMCP](https://chromestatus.com/feature/5117755740913664):
  구현 진행 상태와 마일스톤 추적
- [webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp):
  W3C Web Machine Learning 커뮤니티 그룹의 스펙 제안 저장소. API 형태 논의는 여기서 진행된다
- [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools):
  공식 데모(pizza-maker, react-flightsearch, french-bistro)와 참고 구현
- [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd):
  등록 도구 모니터링, 수동 호출, 스키마 검증, 자연어 에이전트 테스트에 쓰는 확장. W5 평가 도구

스펙이나 Chrome 구현이 바뀌면 명령형 API의 진입점과 시그니처를 다시 확인한다. 변경 사항은
이 계획 문서가 아니라 어댑터(`lib/webmcp/model-context.ts`)에서 처리한다.
