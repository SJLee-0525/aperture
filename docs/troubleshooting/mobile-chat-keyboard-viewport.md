# 모바일 가상 키보드와 뷰포트: Aperture와 AlphaBat에서 겪은 두 사례

작성 2026-08-12
갱신 2026-08-14

상태: Aperture 해결, AlphaBat 증상 A~F 해결. AlphaBat은 2026년 8월 14일 실기기에서 최종 확인했다.

모바일에서 가상 키보드가 열리면 화면은 단순히 키보드 높이만큼 줄어들지 않는다. 브라우저는 포커스된 입력을 보이게 하려고 문서나 스크롤 컨테이너를 밀기도 하고, 운영체제와 브라우저에 따라 Layout Viewport와 Visual Viewport를 다르게 갱신한다.

비슷한 문제를 Aperture와 AlphaBat에서 연달아 겪었다. 두 프로젝트의 증상은 닮았지만 화면 구조와 스크롤 정책이 달랐고, 같은 수정안을 그대로 옮길 수는 없었다. 이 문서는 두 사례를 따로 기록한 뒤 마지막에 공통점과 차이를 비교한다.

---

## 1. Aperture: 전체 화면 챗봇

### 1.1 문제의 모양

Aperture에서는 iOS Safari의 전체 화면 챗봇이 문제였다. 입력창을 누르거나 키보드를 닫을 때 다음 증상이 번갈아 나타났다.

- 키보드가 열려도 챗봇 높이가 줄지 않아 입력창이 가려졌다.
- 패널과 입력창이 화면 위로 이동하고, 키보드 높이만큼 빈 문서 영역이 생겼다.
- 키보드를 닫은 뒤 패널 높이가 원래 뷰포트보다 작게 남았다.
- 최근 메시지를 보고 있던 사용자의 하단 정렬이 풀렸다.
- 이전 메시지를 읽던 사용자까지 자동으로 맨 아래로 이동했다.
- iOS가 `resize` 없이 `scroll`만 보내면 키보드 종료를 감지하지 못했다.

입력 자동 확대와 투명한 Safari UI 아래로 페이지가 비치는 문제도 함께 발견했다. 둘은 뷰포트 계산과 원인이 달라 CSS에서 따로 처리했다.

### 1.2 원인을 좁힌 과정

첫 번째 착오는 CSS의 `100dvh`가 실제 표시 영역과 늘 같을 것이라는 가정이었다. Android Chromium은 `interactive-widget=resizes-content`를 지원하면 Layout Viewport와 `dvh`를 키보드에 맞춰 줄인다. iOS Safari에서는 Layout Viewport와 viewport unit이 키보드 위의 실제 표시 영역과 같은 시점, 같은 크기로 갱신된다고 믿을 수 없었다. 그래서 Visual Viewport를 따로 측정했다.

두 번째 문제는 스크롤 잠금이었다. 일반 모달은 현재 페이지 위치를 보존하려고 모바일에서 `body`를 고정한다. 챗봇에도 같은 정책을 적용하자 Safari의 포커스 팬과 `body.top` 보정이 충돌했다. 그 결과 루트에 키보드 높이만큼 빈 스크롤 영역이 생겼다.

메시지 목록에는 별도 문제가 있었다. 뷰포트 이벤트가 도착하기 전에 목록 높이가 먼저 줄면, 이벤트 시점에 사용자가 하단에 있었는지 계산해도 이미 늦는다. 키보드가 열리기 전의 하단 상태를 저장해야 했다.

### 1.3 시도한 방법과 판단

| 시도                                | 결과                                                        | 판단                                        |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| `offsetTop + height`로 패널 이동    | 전환 중 오버레이가 위아래로 왕복                            | 폐기. 상단 위치는 고정하고 높이만 사용      |
| `100dvh`만 사용                     | Android에서는 동작했지만 iOS에서 입력창과 빈 공간 문제 지속 | iOS fallback 필요                           |
| 챗봇에도 `body: fixed` 적용         | Safari 포커스 팬과 충돌해 빈 문서 영역 생성                 | 챗봇에서만 body 고정 해제                   |
| 뷰포트 이벤트 시점에 하단 여부 계산 | 레이아웃 변경 순서에 따라 결과가 달라짐                     | 평상시 `scroll`에서 미리 저장               |
| `resize`만 구독                     | `scroll`만 오는 iOS 종료 순서를 놓침                        | `resize`, `scroll`, `scrollend`를 함께 구독 |

`offsetTop`은 Safari가 포커스된 입력을 보이게 하려고 화면을 팬하는 동안 계속 바뀐다. 이번처럼 Layout Viewport 상단에 고정한 패널의 위치에도 반영하면 브라우저의 이동과 애플리케이션의 이동이 겹친다. 하단 고정 요소처럼 기준점이 다른 UI까지 적용되는 일반 규칙은 아니다.

### 1.4 채택한 해결 방식

Chromium에는 `interactiveWidget: "resizes-content"`를 선언해 브라우저의 표준 동작을 먼저 사용한다. iOS 모바일에서는 챗봇이 열리고 화면 폭이 640px 이하일 때만 `VisualViewport.height`를 `html`, `body`, `--chat-viewport-height`에 동기화한다. `offsetTop`은 높이나 위치 계산에 넣지 않는다.

키보드를 닫은 뒤 측정 높이가 처음 기록한 전체 높이와 48px 이내로 차이 나면 전체 높이로 되돌린다. 48px은 표준에 정의된 값이 아니라 선행 프로젝트의 iOS 실측에서 가져온 임계값이다. 주소창 상태, 기기와 PWA 표시 모드에 따라 경계가 달라질 수 있으므로 실기기에서 다시 확인해야 한다. 단순 비율로 바꿔도 주소창 변화와 키보드 잔차를 구분할 수는 없다.

```ts
const viewportHeight =
  fullViewportHeight - viewport.height <= 48 ? fullViewportHeight : viewport.height;
```

챗봇의 스크롤 잠금은 `useScrollLock(open, { fixBodyOnMobile: false })`로 분리했다. `body` 위치는 고정하지 않고 overflow만 막는다. 사진, 음악, 개발 모달은 기존 정책을 유지한다.

메시지 목록은 평상시 `scroll` 이벤트에서 사용자가 하단 2px 이내에 있는지 저장한다. 높이를 적용한 다음 프레임에, 키보드가 열리기 전에도 하단에 있었던 경우만 새 `scrollHeight`로 이동한다. 이전 대화를 읽던 사용자의 위치는 건드리지 않는다.

### 1.5 운영체제와 브라우저별 차이

| 환경               | 관찰한 동작                                                                        | 대응                                                     |
| ------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| iPhone / Safari    | Visual Viewport만 줄거나 팬함. 종료 때 작은 높이 오차가 남고 `scroll`만 올 수 있음 | Visual Viewport 높이 동기화, 48px 복원, 여러 이벤트 구독 |
| iPhone / Chrome    | iOS의 WebKit 제약을 공유                                                           | Safari와 같은 경로로 검증                                |
| Android / Chromium | `interactive-widget=resizes-content`로 Layout Viewport와 `dvh`가 줄어듦            | 선언적 동작 우선, JS 보정 최소화                         |
| 데스크톱           | 가상 키보드가 없고 같은 보정이 필요하지 않음                                       | 모바일 폭과 Visual Viewport 존재 여부로 범위 제한        |

### 1.6 검증과 회귀 방지

`e2e/pages/chat.e2e.ts`는 높이가 480px로 줄어드는 경우, `offsetTop` 중간값, `scroll`만 오는 종료 순서, 종료 후 24px 오차를 재현한다. 메시지 목록이 먼저 줄어드는 순서와 이전 대화를 읽는 사용자의 위치도 검사한다.

`src/hooks/use-scroll-lock.test.tsx`는 일반 모달과 챗봇의 잠금 정책을 따로 고정한다. 중첩된 overlay가 서로의 복원을 방해하지 않는지도 확인한다.

관련 커밋 범위는 `9349924`부터 `c425d84`까지다. 같은 범위에서 iOS 한글 display 폰트 fallback도 수정했지만, 뷰포트 문제와 원인은 다르다. Newsreader에 한글 글리프가 없어 iOS가 산세리프를 고르던 문제였고, `--font-display`에 Noto Serif KR 500을 추가했다.

---

## 2. AlphaBat: 풀스크린 모달과 용어집 표

이 절의 파일 경로와 커밋 해시는 AlphaBat 저장소 기준이다. 현재 Aperture 저장소에서는 해당 Git 객체를 조회할 수 없다.

### 2.1 문제의 모양

AlphaBat에서는 챗봇 한 화면이 아니라 10개의 풀스크린 모달이 영향을 받았다. 일반 폼과 용어집 표처럼 내부에 스크롤 컨테이너가 있는 화면이 섞여 있었다. 2026년 8월 14일, iPhone Safari와 Galaxy의 Chrome·삼성 인터넷에서 아래 증상이 해소됐음을 다시 확인했다.

| 증상                                            | 환경                 | 최종 상태             |
| ----------------------------------------------- | -------------------- | --------------------- |
| 반투명 키보드 뒤로 모달과 다른 배경이 비침      | iPhone               | 해결                  |
| 하단 입력을 누르면 모달이 통째로 위로 밀림      | iPhone, Galaxy       | 해결                  |
| 용어집 셀이 표 밖으로 숨거나 표가 잘못 스크롤됨 | 공통                 | Chrome과 iOS에서 해결 |
| 모달 하단이 잘림                                | 공통                 | 해결                  |
| 표 하단 행을 누르면 모달이 말려 올라감          | Galaxy / 삼성 인터넷 | 해결                  |

처음에는 모달이 밀리는 증상을 iPhone 전용으로 봤다. Galaxy에서도 재현된다는 확인을 받은 뒤 Safari 전용 가설을 버릴 수 있었다.

### 2.2 원인을 세 번 잘못 짚었다

첫 분석은 `offsetTop` 누락이었다. 하지만 이 모달은 `top: 0`으로 Layout Viewport 상단에 고정돼 있으므로 높이는 `visualViewport.height` 그대로가 맞다. `offsetTop`을 높이에 더하면 패널이 키보드 뒤로 길어지고, 위치까지 보정할 경우 이중 이동한다.

다음에는 Safari의 포커스 팬으로만 범위를 좁혔다. Galaxy에서도 같은 증상이 나오면서 이 가설도 틀렸다는 것을 알았다. iPhone과 Android Chrome의 공통 원인은 브라우저가 포커스된 입력을 보이게 하려고 스크롤 컨테이너를 프로그램적으로 움직이는 동작이었다.

`overflow: hidden`은 사용자의 스크롤을 막지만 브라우저의 포커스 팬까지 막지는 않는다. iPhone에서는 문서가 움직였고, Android Chrome에서는 `overflow-hidden`인 모달 셸이 스크롤됐다. 겉으로는 둘 다 모달 바닥만 화면 위에 남은 것처럼 보였다.

세 번째 오판은 삼성 인터넷에도 같은 팬 처방이 통할 것이라는 가정이었다. 삼성 인터넷에서는 문서와 모달 셸의 `scrollTop`이 모두 0이었다. 움직인 값은 `visualViewport.offsetTop`이었다. 같은 Chromium 계열이어도 화면을 입력 위로 맞추는 방식이 달랐다.

### 2.3 시도한 방법과 판단

| 시도                                                | 결과                                  | 판단                               |
| --------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| `offsetTop` 반영                                    | 이중 이동 위험                        | 폐기                               |
| 문서 `scrollTop`만 0으로 복원 (`b9d0d574`)          | iPhone 해결, Galaxy 재발              | 팬 주체가 플랫폼마다 다름          |
| 모달 셸과 조상까지 복원 (`31425622`)                | Android Chrome 개선                   | 채택                               |
| 용어집에서 `preventScroll`로 전면 차단 (`7f4e8b4b`) | 키보드에 가린 셀을 볼 수 없음         | 폐기                               |
| 포커스 순간에 표만 정렬 (`da539b00`)                | 키보드가 그 뒤에 열려 다시 가림       | 실행 시점이 늦음                   |
| 높이 변경 다음 프레임에 표 정렬 (`ce61fbb4`)        | Chrome과 iOS에서 편집 셀 노출         | 채택                               |
| 푸터 margin으로 하단 여백 추가 (`243e09c5`)         | 고정 높이 안에서 잘려 회귀 발생       | 구조 재검토                        |
| 셸 padding과 48px 방향 조건 (`fa91bb9a`)            | 사용처의 `p-5`와 충돌해 여백이 사라짐 | 다시 푸터 margin으로 복원          |
| 팬 감시를 최대 1초까지 연장 (`129b7783`)            | Chrome 해결, 삼성 인터넷은 재현       | 삼성은 단순 타이밍 문제가 아님     |
| 안정된 `offsetTop`만 위치에 반영 (`467566f5`)       | 말려 올라감은 해소됐지만 순간 튐 발생 | 정착 후 값만 보고 전환 과정을 놓침 |
| 증가하는 `offsetTop`을 즉시 반영 (`2484b9d9`)       | JS 값은 따라갔지만 순간 튐 잔존       | 남은 원인은 CSS 전환               |
| 뷰포트 위치 보정의 transition 제거 (`f5a2ef0f`)     | 삼성 인터넷의 순간 튐 해소            | 최종 채택                          |

실패한 수정 중 두 개는 새 회귀를 만들었다. 하단 여백을 어디에 둘지 바꾸면서 잘림을 만들었고, 셸의 `max-md:pb-*`가 사용처의 padding과 충돌했다. 모바일 뷰포트 문제는 계산식만 맞춘다고 끝나지 않았다. Tailwind 클래스의 우선순위와 고정 높이 내부의 박스 모델도 같이 봐야 했다.

### 2.4 채택한 해결 방식

풀스크린 모달은 `--visual-vh`를 `visualViewport.height`에 맞춘다. Aperture와 마찬가지로 상단 고정 패널의 높이 계산에는 `offsetTop`을 쓰지 않는다. 키보드 종료 뒤 48px 이내의 작은 오차는 현재 `innerHeight`로 정규화한다. 과거에 측정한 최대 높이를 기준으로 삼으면 주소창이 접혔을 때의 큰 값으로 되돌아가 모달 하단이 잘렸기 때문이다. 여기서도 48px은 실측에 기반한 경험값이다.

포커스 팬은 풀스크린 모달이 열린 동안만 상쇄한다. 문서, 모달 셸, 조상, 모달 안의 숨은 스크롤 박스를 매 프레임 확인해 `scrollTop`을 0으로 되돌린다. 사용자가 직접 굴리는 `auto`와 `scroll` 영역은 보존한다. 뷰포트 높이가 5프레임 연속 같아질 때까지 감시하되, 상한은 1초다.

용어집 표는 별도 처리한다. 셀을 누른 순간에는 키보드가 아직 열리지 않아 모든 것이 보이는 좌표일 수 있다. `--visual-vh`가 줄어든 다음 프레임에 포커스된 입력을 표의 스크롤 영역 안에서 다시 보이게 한다. 이미 보이는 셀은 움직이지 않고, sticky 헤더와 16px 가장자리 여백을 피한다.

배경 비침은 레이아웃 계산으로 풀지 않았다. 오버레이는 Layout Viewport 전체를 덮는데 모달 본체만 Visual Viewport 높이로 줄어들어 둘 사이가 보였기 때문이다. 풀스크린 모달이 열린 모바일 화면에서 오버레이 색을 `var(--background)`로 바꿨다.

```css
@media (max-width: 47.999rem) {
  body:has([data-modal-fullscreen][data-state="open"]) [data-dialog-overlay] {
    background-color: var(--background);
  }
}
```

새 모달은 `MODAL_MOBILE_FULLSCREEN` 클래스만 넣지 않고 `modalFullscreenProps()`를 사용한다. 이 함수가 `data-modal-fullscreen` 표식도 함께 전달한다. 표식이 빠지면 배경 처리와 팬 상쇄가 해당 모달에서만 조용히 동작하지 않는다.

### 2.5 운영체제와 브라우저별 차이

| 환경                 | 관찰한 동작                                                                                    | 상태 또는 대응                                |
| -------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| iPhone / Safari      | Layout Viewport는 유지되고 Visual Viewport가 줄거나 움직임. 반투명 키보드로 오버레이 뒤가 비침 | 높이 동기화, 배경색 교체, 문서 팬 상쇄로 해결 |
| iPhone / Chrome      | iOS WebKit 동작을 공유                                                                         | Safari와 같은 항목 검증                       |
| iPhone / PWA         | 별도 버그 보고가 있어 브라우저 탭과 따로 봐야 함                                               | 실기기 검증 항목에 유지                       |
| Galaxy / Chrome      | 문서 대신 모달 셸이 프로그램적으로 스크롤될 수 있음                                            | 셸과 조상 리셋, 감시 연장으로 해결            |
| Galaxy / 삼성 인터넷 | `scrollTop`은 0인 채 Visual Viewport가 아래로 이동                                             | `offsetTop` 위치 보정과 전환 제거로 해결      |

같은 엔진 계열이라는 이유로 Android Chrome의 결과를 삼성 인터넷에 그대로 적용할 수 없었다. Chrome은 실제 스크롤 컨테이너를 움직였지만 삼성 인터넷은 Visual Viewport의 위치를 바꿨다. 전자는 `scrollTop`을 되돌려 해결했고, 후자는 패널 위치를 Visual Viewport에 맞췄다.

### 2.6 삼성 인터넷: `offsetTop`으로 움직인 보이는 창

용어집 표의 하단 행을 누르면 삼성 인터넷에서만 모달 전체가 위로 말려 올라갔다. 팬 감시 시간을 늘리고 문서, 셸, 조상과 숨은 스크롤 박스까지 초기화해도 남았다. 디버그 오버레이로 받은 실측값이 원인을 갈랐다.

```text
vv 574 / off 320 / inner 894
var 574px
modal top 0 h 574
doc 0 / pan peak 0 x0
```

높이는 이미 맞았다. `--visual-vh`와 모달 높이는 모두 574px이었다. 문서 팬도 없었다. 대신 `visualViewport.offsetTop`이 320px이었고 `574 + 320`은 `innerHeight` 894px과 일치했다. 모달은 Layout Viewport의 `top: 0`에 남아 있었지만 사용자가 보는 Visual Viewport는 320px 아래에서 시작했다. 화면에서 모달이 위로 말려 올라간 것처럼 보인 이유다.

이 값은 앞선 세 번의 `scrollTop` 수정이 삼성 인터넷에서 듣지 않은 이유도 설명했다. 되돌릴 스크롤이 없었다. `scroll-padding`, `scroll-margin`과 포커스 지연도 같은 이유로 이 증상의 직접적인 해법이 아니었다.

### 2.7 높이와 위치를 분리한 보정

`offsetTop`은 `--visual-vh`에 더하지 않는다. 높이는 계속 `visualViewport.height`만 사용한다. 대신 `use-visual-viewport.ts`가 유효한 `offsetTop`을 `--visual-shift`로 내보내고, 모달과 오버레이를 같은 거리만큼 아래로 옮긴다.

```css
@media (max-width: 47.999rem) {
  [data-modal-fullscreen][data-state="open"],
  body:has([data-modal-fullscreen][data-state="open"]) [data-dialog-overlay] {
    translate: 0 var(--visual-shift, 0px);
    transition-property: none;
  }
}
```

2.2절의 초기 오판과는 다른 처리다. 당시에는 `offsetTop`을 높이에 넣으려 했다. 최종 구현은 높이를 그대로 둔 채 위치에만 사용한다. 오버레이도 함께 옮긴다. 모달만 옮기면 배경 경계가 Layout Viewport에 남아 화면 중간에 드러난다.

`transform` 대신 개별 `translate` 속성을 쓴 이유도 있다. 모달 셸과 열림·닫힘 애니메이션이 이미 `transform`을 사용한다. 개별 속성으로 두면 기존 변환과 함께 합성할 수 있다.

### 2.8 삼성의 계단식 이동과 순간 튐

첫 위치 보정은 안정된 `offsetTop`만 반영했다. 말려 올라가는 문제는 줄었지만 키보드가 열릴 때 모달이 순간적으로 튀었다. 정착한 뒤 찍은 화면만 보고 삼성의 `offsetTop`이 안정적이라고 판단한 것이 문제였다. 실제 전환은 다음과 같았다.

```text
height 847 → 574
offsetTop 0 → 72 → 304
```

높이가 먼저 줄고 `offsetTop`이 계단처럼 뒤따랐다. 연속된 동일 값을 기다리는 동안 위치 보정은 0에 머물렀고, 모달은 잠시 Visual Viewport 밖에 남았다. 최종 구현은 증가하는 `offsetTop`을 즉시 반영한다. 감소 방향만 세 번의 표본을 기다린다. 이 조건은 삼성의 단조 증가를 막지 않으면서 iOS 포커스 팬의 왕복 중간값을 바로 따라가지 않게 한다. 24px 미만의 이동은 주소창 전환에서 생긴 작은 오차로 보고 무시한다.

감시 시작과 종료 조건도 함께 바꿨다. 높이 변경을 감지하면 다음 animation frame까지 기다리지 않고 즉시 감시를 시작한다. 종료 조건에서는 `offsetTop`의 안정 여부를 빼서, 높이 감시가 끝난 뒤 늦게 도착한 위치 값도 반영한다.

이 수정 뒤에도 순간 튐은 남았다. 사용자가 튀는 순간에 디버그 수치가 바뀌지 않는다고 알려준 것이 단서였다. JavaScript 값은 최종 위치에 도달했지만 렌더링만 늦었다.

당시 모달의 계산 스타일에는 `transition-property: all`과 200ms duration이 적용돼 있었다. 새로 추가한 `translate`도 전환 대상이 됐고, `--visual-shift`가 `0 → 72 → 304`로 바뀔 때마다 위치가 보간됐다. `transition-property: none`을 적용한 뒤 값 변경 다음 프레임의 `modal top`이 바로 304px로 이동했다. 기존 열림·닫힘 연출은 CSS animation을 사용하므로 그대로 유지됐다.

| 커밋       | 확인한 내용                                                       |
| ---------- | ----------------------------------------------------------------- |
| `467566f5` | `offsetTop`을 `--visual-shift`로 노출하고 모달·오버레이 위치 보정 |
| `2484b9d9` | 증가하는 `offsetTop`은 즉시 반영하고 감소만 지연                  |
| `f5a2ef0f` | 뷰포트 위치 보정의 transition 제거                                |
| `77e7f331` | 원인 확인 뒤 디버그 오버레이 제거                                 |

### 2.9 디버그 오버레이가 바꾼 조사 방식

모바일 실기기에서 콘솔 값을 받기 어려워 화면에 측정값을 겹쳐 표시했다. 이 도구를 넣기 전에는 삼성 인터넷도 스크롤 팬 문제라고 보고 세 번 수정했다. `off 320`, `doc 0`, `pan peak 0`을 한 화면에서 본 뒤에야 높이, 스크롤과 Visual Viewport 위치를 분리할 수 있었다.

측정 도구 자체도 두 번 고쳤다. 처음에는 오버레이를 `100vh - --visual-vh`로 배치해 주소창이나 `offsetTop`이 움직일 때 오버레이까지 떠올랐다. 이후 `offsetTop + height`로 Visual Viewport 하단을 계산했다. `pan peak`은 일반 페이지 스크롤까지 세지 않도록 풀스크린 모달이 열렸을 때만 집계했다.

오버레이는 현재 제거돼 있다. 다시 필요하면 마지막 포함 커밋에서 파일을 복원하고 stage에서만 환경 변수로 마운트한다.

```bash
git show f5a2ef0f:client/src/components/debug/ViewportDebugOverlay.tsx \
  > src/components/debug/ViewportDebugOverlay.tsx
```

디버그 값은 다음처럼 읽는다.

| 값                | 판정 기준                                                |
| ----------------- | -------------------------------------------------------- |
| `var`와 `vv`      | 다르면 높이 계산 문제                                    |
| `modal h`         | `var`와 다르면 모달 높이 문제                            |
| `doc`, `pan peak` | 0이 아니면 스크롤 팬 경로가 있었음                       |
| `off`             | 0이 아니면 Visual Viewport 위치가 이동함                 |
| `modal top`       | 보정 전에는 0, 보정 후에는 유효한 `off`와 같아야 함      |
| `trace`           | `H+N`의 N이 계단식이면 전환 중 `offsetTop`을 추적해야 함 |

### 2.10 검증 범위

`use-visual-viewport.test.ts`의 최종 테스트는 35개다. 팬 상쇄, 48px 정규화의 방향 조건, 표 정렬, 긴 키보드 전환과 삼성 인터넷의 위치 이동을 검사한다. 삼성에서 측정한 `0 → 72 → 304` 시퀀스를 그대로 재생해 증가 즉시 반영, 감소 지연, 종료 후 변수 제거를 확인한다. 각 조건은 구현을 되돌렸을 때 해당 테스트가 실패하는 것까지 확인했다.

jsdom은 실제 레이아웃과 페인팅을 하지 않으며 미디어 쿼리를 포함한 최종 스타일 결과를 신뢰하기 어렵다. `:has()`의 파싱 지원도 jsdom과 선택자 엔진 버전에 따라 달라질 수 있어 Playwright로 다음 항목을 측정했다.

- 모바일과 데스크톱에서 오버레이 배경색이 의도한 조건에만 바뀌는지
- 모달과 오버레이가 `--visual-shift`만큼 함께 이동하고 높이는 유지되는지
- 위치 변경 다음 프레임에 보간 없이 최종 좌표에 도달하는지
- transition을 끈 뒤에도 열림·닫힘 animation이 남아 있는지

실기기에서는 다음 조합을 따로 확인한다.

- iPhone Safari, Chrome, PWA
- Galaxy Chrome, 삼성 인터넷
- 짧은 폼, 긴 폼, 내부 표가 있는 모달
- 키보드 열기와 닫기, 한영 전환, 이모지 키보드, 화면 회전
- 모달이 없는 일반 페이지와 풀스크린이 아닌 모달의 스크롤 위치
- 키보드가 올라오는 동안 패널이 한두 프레임 흔들리거나 번쩍이지 않는지

자동 테스트는 계산을 잠글 수 있지만 모바일 브라우저의 실제 포커스 팬을 처음부터 발견해주지는 못한다. 데스크톱 Chromium은 `offsetTop`을 거의 항상 0으로 보고한다. 이번에는 실기기에서 얻은 시퀀스를 테스트와 Playwright에 재생해 수정 전후 차이를 확인했고, 마지막으로 iPhone Safari, Galaxy Chrome과 삼성 인터넷에서 회귀가 없는지 확인했다.

### 2.11 최종 구현 위치와 회귀 계약

| 파일                                          | 역할                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/hooks/ui/use-visual-viewport.ts`         | `--visual-vh` 동기화, 팬 상쇄, 복원 오차 정규화, 표 정렬, `--visual-shift` 계산 |
| `src/styles/utilities/modal.css`              | 오버레이 배경색, 모달·오버레이 위치 보정, transition 차단                       |
| `src/constants/modal.ts`                      | 풀스크린 셸과 `data-modal-fullscreen` 표식을 함께 제공                          |
| `src/hooks/glossary/focus-within-scroller.ts` | 조상을 밀지 않는 포커스 처리                                                    |
| `src/providers/VisualViewportSync.tsx`        | 앱 루트에서 뷰포트 훅을 한 번 실행                                              |

새 풀스크린 모달은 `MODAL_MOBILE_FULLSCREEN` 클래스만 넣지 않고 `modalFullscreenProps()`를 사용한다. 표식이 빠지면 배경색, 팬 상쇄와 위치 보정이 해당 모달에서만 동작하지 않는다.

영향 범위는 다음 10곳이다.

```text
components/conference/modals/ConferenceEditModal.tsx
components/conference/modals/TranscriptModal.tsx
components/glossary/GlossaryDetailModal.tsx
components/glossary/GlossaryEditModal.tsx
components/meeting/MeetingEditModal.tsx
components/modal/LegalDocumentModal.tsx
features/admin/_modal/conference/AdminCreateConferenceModal.tsx
features/dashboard/_modal/conference-booking/ConferenceBookingModal.tsx
features/dashboard/_modal/glossary/CreateGlossaryModal.tsx
features/dashboard/_modal/meeting/MeetingCreateModal.tsx
```

현재 테스트 수는 `use-visual-viewport.test.ts` 35개, `focus-within-scroller.test.ts` 2개, `modal-fullscreen-marker.test.tsx` 2개, `modal-fullscreen.test.ts` 6개다. 테스트가 잠그는 삼성 인터넷 관련 계약은 다음과 같다.

- `offsetTop`은 `--visual-vh`에 영향을 주지 않는다.
- 24px 미만 이동은 무시한다.
- 증가하는 값은 `0 → 72 → 304`의 각 단계를 즉시 따라간다.
- 잠깐 감소한 값은 바로 반영하지 않지만 계속 낮으면 보정을 해제한다.
- 모달을 정리할 때 `--visual-shift`도 제거한다.
- 모달과 오버레이는 같은 위치로 움직이고 높이는 바뀌지 않는다.
- 위치 보정에는 transition이 적용되지 않지만 열림·닫힘 animation은 유지된다.

---

## 3. 두 사례를 나란히 놓고 얻은 결론

### 같은 원칙이 통했던 부분

두 프로젝트 모두 Layout Viewport와 Visual Viewport를 구분한 뒤에야 문제가 풀렸다. 상단에 고정된 전체 화면 패널의 높이는 `visualViewport.height`를 기준으로 삼았고, `offsetTop`을 높이에 섞지 않았다. 키보드가 닫힌 뒤 남는 작은 높이 오차에는 실기기에서 얻은 48px 임계값을 사용했다.

또 하나의 공통점은 이벤트 한 번으로 끝나지 않는다는 점이다. 키보드 전환 중 `resize`, `scroll`, `scrollend`의 순서가 달라질 수 있고 레이아웃은 이벤트보다 먼저 바뀌기도 한다. 높이를 적용한 뒤 다음 프레임에 스크롤을 맞추고, 전환이 끝날 때까지 필요한 상태를 보존해야 했다.

### 그대로 옮기면 안 됐던 부분

| 쟁점             | Aperture                                  | AlphaBat                                                 |
| ---------------- | ----------------------------------------- | -------------------------------------------------------- |
| 화면 구조        | 챗봇과 메시지 목록                        | 여러 풀스크린 모달과 중첩 표                             |
| 스크롤 잠금      | `body: fixed`를 챗봇에서 해제             | Radix가 이미 overflow 방식이라 별도 변경 없음            |
| 지켜야 할 스크롤 | 사용자가 하단에 있었는지                  | 문서와 셸은 0, 표의 사용자 스크롤은 보존                 |
| Android 대응     | `interactive-widget=resizes-content` 사용 | 현재 Chrome 동작이 정상이라 선언 추가를 보류             |
| `offsetTop` 처리 | 패널 계산에서 제외                        | 높이에서는 제외하고 삼성 인터넷의 위치 보정에만 사용     |
| 최종 상태        | 문서화 범위에서 해결                      | iPhone Safari, Galaxy Chrome과 삼성 인터넷에서 해결 확인 |

Aperture에서는 사용자가 하단을 보고 있었는지 키보드 전환 전에 기억해야 했다. AlphaBat에서는 움직인 좌표부터 찾아야 했다. iPhone과 Chrome에서는 문서나 `overflow-hidden` 셸이 스크롤됐고, 삼성 인터넷에서는 Visual Viewport의 원점이 바뀌었다.

### 다음 프로젝트에서 적용할 진단 순서

1. 모달 전체가 움직이는지, 내용만 움직이는지부터 본다.
2. `visualViewport.height`, `offsetTop`, 모달의 `top`과 `height`, 각 스크롤 컨테이너의 `scrollTop`을 같은 시점에 기록한다.
3. iOS 전용이라고 단정하기 전에 Android Chrome과 삼성 인터넷을 나눠 확인한다.
4. 포커스 순간과 키보드가 줄어든 다음 프레임을 구분한다.
5. 스크롤 잠금이 사용자 스크롤만 막는지, `body` 위치까지 고정하는지 확인한다.
6. 정착한 뒤의 한 장면만 보지 말고 전환 중 `height`와 `offsetTop`의 시퀀스를 기록한다.
7. 수치는 맞는데 화면이 늦게 움직이면 transition, animation과 합성 속성을 확인한다.
8. 작은 수정안을 독립 배포하고 실기기 결과를 남긴다. 계산식만 보고 다음 패치를 만들지 않는다.

가장 오래 걸린 이유는 브라우저별 차이 자체보다 측정값 없이 원인을 골랐기 때문이다. Aperture의 선행 경험은 AlphaBat에서 `offsetTop`을 높이에 넣는 오분석을 뒤집는 데 도움이 됐다. 하지만 중첩 스크롤과 삼성 인터넷의 Visual Viewport 이동까지 설명하지는 못했다. 두 프로젝트 사이에서 재사용한 것은 코드보다 진단 기준이었다.

## 참고 자료

- [VisualViewport.offsetTop, MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetTop)
- [VirtualKeyboard API를 이용한 대안적 접근, Bram.us](https://www.bram.us/2021/09/13/prevent-items-from-being-hidden-underneath-the-virtual-keyboard-by-means-of-the-virtualkeyboard-api/) (iOS에서는 사용할 수 없어 현재 구현에는 적용하지 않음)
- [Toolbars, keyboards, and the viewports, QuirksBlog](https://www.quirksmode.org/blog/archives/2017/06/toolbars_keyboa.html)
- [How to get the document height in iOS Safari when the OSK is open, Martijn Hols](https://martijnhols.nl/blog/how-to-get-document-height-ios-safari-osk)
- [Control the Viewport Resize Behavior with `interactive-widget`, HTMHell](https://www.htmhell.dev/adventcalendar/2024/4/)
- [`<meta name="viewport">`, MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
- [fixed/sticky와 가상 키보드, CSSWG issue #7475](https://github.com/w3c/csswg-drafts/issues/7475)
- [iOS 15 이후 Visual Viewport 높이 문제, WICG issue #78](https://github.com/WICG/visual-viewport/issues/78)
