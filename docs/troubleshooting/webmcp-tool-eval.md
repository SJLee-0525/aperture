# WebMCP 도구 평가 트러블슈팅

> 범위: 프로덕션(sungjoon.works)에 등록된 WebMCP 도구 13종의 에이전트 평가와 반복 개선
> 관련 결정: [ADR-0003: 공개 페이지의 WebMCP 도구 노출](../adr/0003-webmcp-agent-tools.md)
> 구현 계획: [WebMCP 에이전트 도구 구현 계획](../plan/04-webmcp-agent-tools.md)

배포하고, Tool Inspector로 돌려보고, 응답을 여기 기록하고, 고칠 게 나오면 고쳐서 다시 배포한다.
평가는 확률적이라 한 번의 실패로 결론 내지 않는다. 같은 발화를 두세 번 돌려 재현되는 것만 잡는다.

## 빠른 판별표

| 증상                                  | 먼저 볼 것               | 의미·조치                                                                                                |
| ------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| 도구 목록이 비어 있음                 | Chrome 버전과 진입점     | 149는 `navigator.modelContext`만 노출한다. 어댑터가 둘 다 보므로 목록이 비면 배포가 안 나간 것이다.      |
| 기대한 도구가 목록에 없음             | 현재 페이지 경로         | 섹션 도구는 해당 페이지에서만 등록된다. 아래 페이지 표를 확인하고 이동 후 다시 본다.                     |
| `document.modelContext`가 `undefined` | `navigator.modelContext` | 구 진입점만 있는 버전이다. 콘솔 검증은 `navigator` 쪽으로 한다.                                          |
| Inspector가 429 에러로 멈춤           | 에러 본문의 모델명       | Inspector 내장 모델(무료)의 분당 5회 제한이다. 우리 코드와 무관하다. 1분 쉬고 시나리오를 하나씩 돌린다.  |
| 에이전트가 엉뚱한 항목을 설명함       | 호출 로그의 id 인자      | 대화 기록의 낡은 id를 재사용한 것. 상세 도구는 id 생략 시 열린 모달을 읽도록 고쳤다(1차 평가 4번).       |
| 도구 결과와 화면 결과가 다름          | 배포 시점                | 도구는 화면과 같은 함수를 쓴다. 다르면 ISR 캐시(1시간)와 배포 버전 차이를 먼저 의심한다.                 |
| 검색이 0건인데 화면 검색은 나옴       | 질의 언어와 인덱스       | 검색 인덱스는 제목·부제 중심이다. 본문에만 있는 단어는 안 잡힌다. 도구 결함이 아니라 인덱스 범위 문제다. |

## 페이지별 도구

섹션 도구는 그 페이지의 컴포넌트가 마운트될 때만 등록된다. 다른 페이지에서 부르면
에이전트는 그 도구의 존재 자체를 모르고 전역 검색으로 우회한다. 이건 설계다
(페이지당 노출 5개 이하, ADR-0003).

| 페이지             | 등록되는 도구 (전역 2종 + 섹션)                    |
| ------------------ | -------------------------------------------------- |
| 모든 공개 페이지   | `search_portfolio` `get_profile`                   |
| `/ko/photo`        | + `filter_photos` `get_photo_details` `open_photo` |
| `/ko/photo/albums` | + `list_albums`                                    |
| `/ko/photo/map`    | + `list_photo_locations`                           |
| `/ko/dev/projects` | + `list_projects` `get_project` `open_project`     |
| `/ko/music`        | + `list_music_works` `get_music_work`              |
| `/ko/music/career` | + `list_music_awards`                              |
| `/ko/contact`      | + `prepare_contact_message` (선언형 폼)            |

## 콘솔로 직접 확인하기

Inspector 없이도 등록 여부와 실행 결과는 콘솔에서 볼 수 있다. 쿼터도 안 쓴다.

```js
const mc = document.modelContext ?? navigator.modelContext;
(await mc.getTools()).map((t) => t.name);
```

```js
const tools = await mc.getTools();
const tool = tools.find((t) => t.name === "list_projects");
await mc.executeTool(tool, JSON.stringify({ tech: "React.js" }));
```

콘솔 직접 호출은 결정론 검증용이다. "에이전트가 올바른 도구를 고르는가"는 Inspector의
자연어 테스트로만 볼 수 있다.

## 기록 양식

평가 한 건마다 아래를 남긴다. Inspector 로그는 원문 그대로 붙이는 편이 낫다.
요약하면 나중에 "왜 그렇게 판정했더라"를 복기할 수 없다.

```
### N차 · YYYY-MM-DD · 페이지
발화:
호출 로그: (Inspector 원문)
판정: 통과 / 결함 / 판단 보류
조치: (커밋 해시 또는 없음)
```

## 1차 평가 · 2026-08-11

배포 버전 v1.0.2 + Chrome 149 폴백 픽스. 시나리오 5종 중 로직 결함 1건,
나머지 3건은 전부 "도구가 답은 하는데 무엇을 물을 수 있는지, 화면이 어떤 상태인지
알려주지 않는" 같은 부류였다.

### 1-1. React 프로젝트 · `/ko/dev/projects`

발화: "이 사람 React 프로젝트 보여줘"

```
AI calling tool "list_projects" with {"tech":"React"}
Tool "list_projects" result: No projects use "React". Known tech tags: Next.js,
React.js, TypeScript, CSS Modules, Firebase Auth, Firebase Storage, Firestore,
MapLibre GL, exifr, browser-image-compression, Canvas API, Motion, dnd-kit,
Vitest, Playwright, i18n, ISR, RAG, Claude Design, Claude Code, OpenAI Codex,
Google Antigravity, Electron, WebSocket, Web Audio API, AudioWorklet, Zustand,
Tanstack Query, React Hook Form, Zod, TailwindCSS, Radix UI, MSW, Sentry, PWA,
Python, Gradio 6, HTML, CSS, JavaScript, GSAP, ScrollTrigger, Vite, Yarn Berry,
Microsoft Copilot, Quill, React Force Graph, React Router, Axios, Error Boundary,
QRCode.react, Context API, Recharts, date-fns, Vue.js, Pinia, Vue Router,
Chart.js, Kakao Map API, Bootstrap.

AI calling tool "list_projects" with {"tech":"React.js"}
Tool "list_projects" result:
통합 포트폴리오 (2026) · 개인 프로젝트 · 웹 · O8n0DCbm2uFO24oixptx · /ko/dev/projects?project=O8n0DCbm2uFO24oixptx
AlphaBat (2026) · 기업 프로젝트 · AI 실시간 통역 플랫폼 · t0EAYuIMH6t6OMqLL3ro · /ko/dev/projects?project=t0EAYuIMH6t6OMqLL3ro
개인 포트폴리오 (2025) (2025) · 개인 프로젝트 · 웹 · dbx0CTaQMgqnD8hoptOj · /ko/dev/projects?project=dbx0CTaQMgqnD8hoptOj
Mail@ (2025) · SSAFY 자율 프로젝트 · 데스크탑 앱 · eLM8lC6Sjj3tvZYDUyOY · /ko/dev/projects?project=eLM8lC6Sjj3tvZYDUyOY
레시피디아 (2025) · SSAFY 삼성전자 DA사업부 연계 프로젝트 · jEmWC1dhRF0dpWDqIoq8 · /ko/dev/projects?project=jEmWC1dhRF0dpWDqIoq8
영웅이 (2025) · SSAFY 공통 프로젝트 · AIoT · XsHpScxJjYaALhEcgLvi · /ko/dev/projects?project=XsHpScxJjYaALhEcgLvi
```

최종 응답:

> React.js를 사용한 프로젝트들은 다음과 같습니다:
>
> 1. **통합 포트폴리오 (2026)**: 현재 보고 계신 이 포트폴리오 사이트입니다. (Next.js, React.js, TypeScript 등 사용)
> 2. **AlphaBat (2026)**: AI 실시간 통역 플랫폼 구축 프로젝트입니다.
> 3. **개인 포트폴리오 (2025)**: 2025년 버전의 개인 포트폴리오 웹사이트입니다.
> 4. **Mail@ (2025)**: SSAFY 자율 프로젝트로 진행된 데스크탑 애플리케이션입니다.
> 5. **레시피디아 (2025)**: SSAFY와 삼성전자 DA사업부 연계 프로젝트입니다.
> 6. **영웅이 (2025)**: SSAFY 공통 프로젝트로 진행된 AIoT 관련 프로젝트입니다.
>
> 더 자세히 알고 싶은 프로젝트가 있다면 말씀해 주세요!

판정: 결과는 맞았지만 첫 호출이 헛발질. 스키마 예시가 `'React'`였는데 실데이터 태그는
`React.js`다. 우리가 틀린 예시를 준 셈이다. 에러에 태그 목록을 넣어둔 게 자가 복구로
이어진 건 확인됐다.

조치: 예시를 `React.js`로 교체, 매칭에 `.js` 접미사 정규화 추가. 정규화는 정확 일치를
바꾸지 않고 miss만 줄인다. 0건일 때 태그 목록 안내는 그대로 둔다.

같은 날 "이 사람 react.js 프로젝트 알려줘"로 다시 물었을 때는 헛발질 없이 한 번에
6건을 상세 링크와 함께 냈다. 정확한 태그를 주면 문제없다는 대조군.

### 1-2. 필름 카메라 · `/ko/photo`

발화: "필름 카메라로 찍은 사진만"

```
AI calling tool "search_portfolio" with {"section":"photo","query":"Film"}
Tool "search_portfolio" result:
DSCF13557 · photo · /ko/photo?photo=FXEBfbqsNHWwlObyWoqq
DSCF13562 · photo · /ko/photo?photo=1oSkHr9rLGSpCfXW9cBl
DSCF13552 · photo · /ko/photo?photo=W0N5WCuMe1GnksrlFUUG
DSCF13551 · photo · /ko/photo?photo=x58AH83WqZhm0QVk6Rc4
DSCF13550 · photo · /ko/photo?photo=96AQPQoRc3bOlZXtthSP
DSCF13549 · photo · /ko/photo?photo=eRdXZubT1oOWgl5Dyh6y
DSCF13559 · photo · /ko/photo?photo=EXRfR7g6v6ih3PYFqBuQ
DSCF13547 · photo · /ko/photo?photo=po3eEMSXaGFbarTvtLix
+28 more

AI calling tool "search_portfolio" with {"section":"photo","query":"Analog"}
Tool "search_portfolio" result: No results for "Analog".
```

최종 응답:

> 검색 결과, 'Film' 키워드와 관련된 사진들이 확인됩니다. 다만, 파일명(DSCF...)으로 보아
> 후지필름 디지털 카메라의 필름 시뮬레이션을 사용한 사진일 가능성도 있습니다.
>
> 필름 느낌의 사진들을 확인해 보시겠어요?
>
> - DSCF13557 (/ko/photo?photo=FXEBfbqsNHWwlObyWoqq)
> - DSCF13562 (/ko/photo?photo=1oSkHr9rLGSpCfXW9cBl)
> - DSCF13552 (/ko/photo?photo=W0N5WCuMe1GnksrlFUUG)
> - DSCF13551 (/ko/photo?photo=x58AH83WqZhm0QVk6Rc4)
> - DSCF13550 (/ko/photo?photo=96AQPQoRc3bOlZXtthSP)
>
> 전체 사진 목록은 사진 섹션(/ko/photo)에서 확인하실 수 있습니다. 특정 카메라 모델이나
> 필름 기종을 알고 계신다면 더 정확한 검색이 가능합니다.

판정: `filter_photos`가 등록돼 있는데도 검색으로 우회했다. "필름 카메라"는 카메라
이름이 아니라 분류라서, 어떤 카메라가 있는지 모르는 상태에선 필터를 부를 수 없다.
`"Film"` 검색이 그럴듯한 결과를 낸 건 인덱스의 `FUJIFILM`에 부분 일치한 우연이다.
에이전트가 파일명 접두사에서 후지필름을 추론해낸 건 인상적이었지만 설계가 기댈 곳은 아니다.

조치: `filter_photos`를 인자 없이 부르면 사용 가능한 태그·카메라 목록을 반환하게 했다.
참고로 실데이터 카메라는 전부 디지털이라 이 발화 자체가 데이터와 안 맞는다. 다음 평가에선
"캐논으로 찍은 사진만"처럼 실제 장비 기준으로 바꾼다.

### 1-3. 피아노 리사이틀 · 프로젝트 페이지에서 실행 (페이지 오류)

발화: "피아노 리사이틀 언제 했어?"

```
AI calling tool "search_portfolio" with {"section":"music","query":"리사이틀"}
Tool "search_portfolio" result: No results for "리사이틀".

AI calling tool "search_portfolio" with {"query":"recital","section":"music"}
Tool "search_portfolio" result: No results for "recital".

AI calling tool "search_portfolio" with {"section":"music","query":"피아노"}
Tool "search_portfolio" result:
연세대학교 창립 138주년 챔버 뮤직페스티벌 · music · /ko/music?work=LqclfrH0dfjOwLHJFdhr
2019 신춘음악회 '명작' · music · /ko/music?work=gviMfeuCoVlsqRTOdyYa

AI calling tool "search_portfolio" with {"query":"연주회","section":"music"}
Tool "search_portfolio" result: No results for "연주회".

AI calling tool "search_portfolio" with {"query":"졸업","section":"music"}
Tool "search_portfolio" result: No results for "졸업".

AI calling tool "search_portfolio" with {"query":"piano","section":"music"}
Tool "search_portfolio" result:
연세대학교 창립 138주년 챔버 뮤직페스티벌 · music · /ko/music?work=LqclfrH0dfjOwLHJFdhr
2019 신춘음악회 '명작' · music · /ko/music?work=gviMfeuCoVlsqRTOdyYa

⚠️ Error: ApiError 429 RESOURCE_EXHAUSTED
   generativelanguage.googleapis.com / gemini-3-flash
   GenerateRequestsPerMinutePerProjectPerModel-FreeTier: limit 5
   "Please retry in 41.5s"
```

판정: `/ko/music`이 아니어서 `list_music_works`가 없었고, 검색만 여섯 번 두드리다
쿼터에 걸렸다. 페이지 스코프는 설계대로다. 다만 "리사이틀" 0건은 실데이터의 카테고리가
챔버 뮤직페스티벌·신춘음악회뿐이라 그렇다.

조치: 코드 변경 없음. `/ko/music`에서 재실행 필요. 시나리오 문구도 실데이터 기준으로 조정.

### 1-4. 이 사진 어디서 찍었어 · `/ko/photo` (결함)

Canon EOS R6 Mark III 사진을 모달로 열어두고 실행했다.

발화: "이 사진 어디서 찍었어?"

```
AI calling tool "get_photo_details" with {"photoId":"FXEBfbqsNHWwlObyWoqq"}
Tool "get_photo_details" result:
DSCF13557
국립중앙박물관, 137, 서빙고로, 용산동6가, 서빙고동, 용산구, 서울특별시, 04383, 대한민국
FUJIFILM X100V +
f/2 · 1/450 · ISO 200 · 23 mm
/ko/photo?photo=FXEBfbqsNHWwlObyWoqq
```

최종 응답:

> 이 사진(DSCF13557)은 서울특별시 용산구에 위치한 **국립중앙박물관**에서 촬영되었습니다.
>
> 후지필름 X100V 카메라를 사용해 촬영된 사진으로 확인됩니다. 다른 사진의 위치도
> 궁금하시다면 말씀해 주세요!

판정: 결함. 열린 사진은 R6인데 답은 후지 사진이다. 넘긴 id는 1-2 검색 결과 첫 번째
항목의 값이다. `photoId`가 필수 인자라 에이전트가 "지금 열린 사진"을 알 방법이 없었고,
대화 기록에서 아는 id를 채워 넣었다. 페이지 상태를 노출하는 게 WebMCP의 요지인데
우리 도구가 상태를 안 읽고 있었다.

조치: `get_photo_details`·`get_project`·`get_music_work`의 id를 선택 인자로 바꾸고,
생략하면 URL query(`?photo=` 등)의 열린 모달을 대상으로 삼는다.

### 1-5. 연락하고 싶어 · 임의 페이지

발화: "연락하고 싶어"

```
AI calling tool "search_portfolio" with {"query":"email"}
Tool "search_portfolio" result: Mail@ · dev · /ko/dev/projects?project=eLM8lC6Sjj3tvZYDUyOY

AI calling tool "search_portfolio" with {"query":"연락처"}
Tool "search_portfolio" result: No results for "연락처".
```

최종 응답:

> 이성준 님께 연락하시려면 아래 정보를 알려주세요. 제가 대신 **연락처 양식을 작성**해
> 드릴 수 있습니다.
>
> - 성함
> - 이메일 주소
> - 전하실 메시지
>
> 혹은 직접 작성하고 싶으시다면, 사이트 내의 연락하기(Contact) 페이지를 이용하실 수도
> 있습니다. (일반적으로 포트폴리오 사이트 하단이나 메뉴에 위치합니다.)
>
> 정보를 말씀해 주시면 바로 준비해 드릴까요?

판정: 어느 도구도 `/contact` 경로를 알려주지 않아 막다른 길. "email" 검색은 메일 앱
프로젝트(Mail@)에 걸리는 동음이의 오탐까지 냈다. 대신 에이전트가 폼 제출을 시도하지
않고 멈춘 것은 의도한 경계 그대로였다.

조치: `get_profile` 출력에 `contact:` 경로를 섹션 필터와 무관하게 항상 포함.

## 재검증 대기

1차 조치 배포 후 같은 조건으로 다시 돌린다. 기대 변화까지 적어두고 어긋나면 위에 기록.

- [ ] "이 사람 React 프로젝트 보여줘" — 첫 호출 `{"tech":"React"}`가 바로 6건을 내는지
- [ ] "캐논으로 찍은 사진만" (`/ko/photo`) — `filter_photos` 무인자 호출로 카메라 목록을
      먼저 확인하고 필터로 이어지는지
- [ ] "피아노 연주 언제 했어?" (`/ko/music`) — `list_music_works`를 쓰는지
- [ ] 사진 모달 열고 "이 사진 어디서 찍었어?" — id 없이 호출해 열린 사진을 맞히는지
- [ ] "연락하고 싶어" (랜딩) — `get_profile`에서 `/ko/contact` 경로를 얻어 안내하는지
