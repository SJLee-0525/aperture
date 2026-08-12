# 모바일 챗봇에서 키보드가 빈 공간과 스크롤 이탈을 만드는 문제

## 기록 범위

이 문서는 `9349924`부터 `c425d84`까지 진행한 모바일 챗봇 수정 과정을 정리한다. 같은 작업의 다른 Git 계보에서는 프로젝트 원고에 일부 내용이 기록됐지만, 지정한 계보의 마지막 문서 커밋에는 해당 원고 변경이 포함되지 않았다. 현재 구현을 기준으로 증상, 실패한 접근과 회귀 조건을 다시 기록한다.

관련 범위에는 iOS 챗봇 viewport 문제 외에 입력 자동 확대 방지와 한글 display 폰트 fallback 수정도 포함된다.

## 증상

iOS Safari에서 전체 화면 챗봇의 입력창을 누르거나 키보드를 닫을 때 다음 문제가 번갈아 나타났다.

- 키보드가 열려도 챗봇 높이가 줄지 않아 입력창이 가려졌다.
- 패널과 입력창이 화면 위로 이동하고, 키보드 높이만큼 빈 문서 영역이 생겼다.
- 키보드를 닫은 뒤 패널 높이가 원래 viewport보다 작게 남았다.
- 최근 메시지를 보고 있던 사용자가 키보드를 열면 메시지 목록의 하단 정렬이 풀렸다.
- 이전 메시지를 읽고 있던 사용자도 자동으로 맨 아래로 이동했다.
- iOS가 `resize` 없이 `scroll`만 보내면 키보드 종료 상태를 감지하지 못했다.

모바일 Safari의 입력 자동 확대와 투명한 브라우저 UI 아래로 페이지가 비치는 현상도 함께 관찰됐다. 이 문제는 챗봇 viewport 계산과 원인이 달라 별도 CSS 범위에서 처리했다.

## 원인

### Layout Viewport와 Visual Viewport의 역할이 달랐다

소프트 키보드가 나타났을 때 브라우저가 CSS layout viewport와 실제 표시 영역을 같은 방식으로 줄인다고 가정한 것이 첫 원인이었다.

Android Chromium은 `interactive-widget=resizes-content`를 사용하면 layout viewport와 `dvh`가 키보드에 맞춰 줄어든다. iOS Safari는 Visual Viewport를 축소하거나 팬하면서도 layout viewport, `position: fixed`와 `overflow: hidden`을 같은 순서로 갱신하지 않는다.

따라서 `100dvh`만 사용하면 iOS의 실제 표시 높이를 놓칠 수 있다. 반대로 `VisualViewport.height`와 `offsetTop`을 모두 CSS 위치에 반영하면 Safari의 기본 포커스 팬과 애플리케이션 보정이 중복된다.

### 스크롤 잠금의 body 고정이 Safari의 포커스 팬과 충돌했다

일반 모달은 현재 페이지 위치를 보존하기 위해 모바일에서 `body`를 fixed로 고정한다. 챗봇에도 같은 정책을 적용하자 Safari가 입력창을 보이게 하려고 문서를 팬하는 동작과 `body.top` 보정이 충돌했다. 그 결과 루트에 키보드 높이만큼 스크롤 가능한 빈 영역이 남았다.

챗봇은 일반 모달과 달리 키보드가 열린 상태에서 viewport 높이를 계속 추적해야 한다. 그래서 `useScrollLock(open, { fixBodyOnMobile: false })`를 사용하며, 기존 사진·음악·개발 모달은 body 위치 고정 정책을 유지한다.

### viewport 이벤트보다 메시지 레이아웃이 먼저 바뀔 수 있었다

초기 구현은 Visual Viewport 이벤트가 발생했을 때 메시지 목록의 현재 치수로 하단 여부를 계산했다. iOS가 목록 높이를 먼저 줄이면 사용자가 직전까지 하단에 있었어도 이벤트 시점에는 이미 하단에서 떨어진 것으로 계산된다.

하단 여부는 viewport 이벤트 안에서 새로 판단하면 안 된다. 평상시 메시지 목록의 `scroll` 이벤트에서 2px 허용 범위로 상태를 저장하고, viewport 전환 중에는 저장된 값을 유지해야 한다.

### 키보드 종료 값과 이벤트 종류가 일정하지 않았다

iOS는 키보드를 닫은 뒤 Visual Viewport 높이를 초기값보다 수십 px 작게 남길 수 있다. 어떤 종료 순서에서는 `resize` 대신 `scroll`만 발생했다. 하나의 이벤트만 구독하거나 마지막 height를 그대로 신뢰하면 챗봇 하단에 빈 공간이 남는다.

## 시도했지만 유지하지 않은 접근

### `offsetTop + height`로 패널 전체를 이동

Visual Viewport의 `offsetTop`은 포커스 자동 팬 중 중간값을 연속으로 낸다. 이 값을 패널 상단에 적용하자 오버레이가 키보드 전환 중 위아래로 왕복했다. 최종 구현은 상단 위치를 고정하고 표시 높이만 사용한다.

### `100dvh`만 사용

Android에서는 viewport meta 설정과 함께 동작했지만, iOS에서는 키보드가 열린 실제 영역과 패널 높이가 어긋났다. Safari의 기본 동작에만 맡기는 변경도 시도했으나 입력창 위 빈 공간과 루트 스크롤 문제를 해결하지 못했다.

### 챗봇에서도 `body: fixed` 사용

배경 스크롤은 막았지만 Safari의 포커스 팬과 중복돼 빈 문서 영역을 만들었다. body 위치 고정 여부를 `useScrollLock` 옵션으로 분리해 챗봇만 사용하지 않도록 했다.

### viewport 이벤트 시점에 하단 여부 재계산

브라우저의 레이아웃과 이벤트 순서가 바뀌면 결과도 달라졌다. 전환 전에 저장한 하단 상태를 사용하고, 높이를 적용한 다음 animation frame에서 스크롤 위치를 맞추는 방식으로 교체했다.

### `resize` 이벤트만 구독

키보드 종료가 `scroll`로만 전달되는 iOS 순서를 놓쳤다. 현재는 Visual Viewport의 `resize`, `scroll`, `scrollend`와 window `resize`를 같은 동기화 함수에 연결한다.

## 현재 해결 방식

### 1. 플랫폼의 표준 동작을 먼저 사용한다

루트 viewport metadata는 `interactiveWidget: "resizes-content"`를 사용한다. 이를 지원하는 Chromium에서는 layout viewport와 `dvh`가 키보드에 맞춰 줄어든다.

### 2. iOS 모바일에서 표시 높이만 동기화한다

챗봇이 열리고 화면 폭이 640px 이하이며 `window.visualViewport`가 있을 때만 보정한다. Visual Viewport의 높이를 `html`, `body`와 `--chat-viewport-height`에 적용한다. `offsetTop`은 레이아웃 계산에 사용하지 않는다.

키보드 종료 값이 처음 기록한 전체 높이와 48px 이내라면 전체 높이로 정규화한다. Safari가 남긴 작은 오차 때문에 하단 틈이 생기는 것을 막기 위한 범위다.

```ts
const viewportHeight =
  fullViewportHeight - viewport.height <= 48 ? fullViewportHeight : viewport.height;
```

높이를 적용할 때 루트 스크롤을 0으로 되돌려 Safari의 문서 팬이 챗봇 밖의 빈 영역으로 남지 않게 한다. 챗봇을 닫으면 원래 inline height와 페이지의 `scrollX`, `scrollY`를 복원한다.

### 3. 메시지 하단 상태를 viewport 전환 전에 저장한다

메시지 목록의 일반 `scroll` 이벤트에서 사용자가 하단 2px 이내에 있는지 기록한다. viewport 동기화 중 발생한 `scroll` 이벤트는 상태를 덮어쓰지 않는다.

높이를 적용한 다음 frame에서 기존 상태가 하단이었던 경우에만 새 `scrollHeight`로 이동한다. 이때 smooth scroll을 잠시 끈다. 사용자가 이전 대화를 읽고 있었다면 위치를 강제로 바꾸지 않는다.

### 4. 스크롤 잠금 책임을 분리한다

챗봇은 body 위치를 fixed로 바꾸지 않고 루트와 body의 overflow만 잠근다. 일반 모달은 기존 위치 보존 정책을 계속 쓴다. 여러 overlay가 동시에 잠금을 요청해도 마지막 소비자가 닫힐 때까지 원래 스타일을 복원하지 않는다.

### 5. 입력 확대와 브라우저 UI 배경은 CSS에서 처리한다

iOS 터치 환경의 `input`, `textarea`, `select`는 계산 글꼴 크기를 16px 이상으로 유지해 포커스 자동 확대를 막는다. 챗봇 overlay 바깥으로 페이지가 비치는 문제는 테마 배경색을 쓰는 불투명 레이어로 막는다. 전역 폼 스타일을 바꾸지 않아 연락 폼과 다른 모바일 화면의 시각 기준선을 유지한다.

## 메시지 하단 추적 시 주의할 점

메시지가 추가될 때의 자동 스크롤과 키보드 viewport 전환은 서로 다른 경로다.

- 새 응답이 추가되면 기존 메시지 effect가 최신 메시지로 이동한다.
- 키보드가 열리거나 닫히면 저장된 `messageListAtBottomRef`를 기준으로 선택적으로 이동한다.
- viewport 동기화 중에는 목록의 `onScroll`이 저장된 상태를 바꾸지 않는다.
- 높이 적용과 스크롤 보정 사이에는 한 frame을 둬 변경된 `scrollHeight`를 사용한다.

이 경계를 합치면 사용자가 이전 대화를 읽는 동안 새 viewport가 강제로 하단으로 이동시키거나, 반대로 최신 메시지가 키보드 아래로 밀릴 수 있다.

## 회귀 테스트

`e2e/pages/chat.e2e.ts`는 실제 iOS 이벤트 순서를 직접 모의한다.

- Visual Viewport가 480px로 줄었을 때 root, body와 overlay 높이가 함께 줄어든다.
- `offsetTop` 중간값이나 Visual Viewport scroll이 패널 상단을 이동시키지 않는다.
- 키보드 종료 후 24px 오차가 남은 높이는 최초 전체 높이로 복원된다.
- 키보드 종료가 `scroll` 이벤트만 보내도 전체 높이로 복원된다.
- 메시지 레이아웃이 viewport 이벤트보다 먼저 줄어도 기존 하단 상태를 유지한다.
- 이전 대화를 읽던 사용자는 viewport 변경 뒤에도 강제로 하단으로 이동하지 않는다.
- 챗봇을 닫으면 페이지의 원래 스크롤 위치가 복원된다.

`src/hooks/use-scroll-lock.test.tsx`는 다음 계약을 고정한다.

- 기본 모바일 모달은 body 위치를 고정하고 원래 스타일과 스크롤을 복원한다.
- 챗봇 옵션은 body 위치를 고정하지 않는다.
- 중첩된 잠금 소비자는 서로의 복원을 방해하지 않는다.
- 잠금 중 breakpoint가 바뀌면 body 고정 정책을 다시 계산한다.

## 함께 수정한 한글 display 폰트

같은 커밋 범위에서 iOS의 한글 display 텍스트가 고딕체로 보이는 문제도 수정했다. Newsreader는 Latin 글리프만 포함하므로 한글 렌더링을 운영체제 fallback에 맡기고 있었다. iOS에서는 이 fallback이 산세리프로 결정됐다.

`--font-display`의 두 번째 글꼴로 Noto Serif KR 500을 추가했다. CSS의 글리프별 fallback에 따라 영문은 Newsreader, 한글은 Noto Serif KR로 표시된다. 두 폰트는 `next/font`로 제공하며 E2E Google Font mock에도 같은 요청을 등록한다.

이 문제는 viewport와 직접 관련이 없다. 다만 실제 iOS 검증 중 함께 발견됐고 지정한 커밋 범위에 포함되므로 이 문서에 기록한다.

## 재발 방지 원칙

- 모바일 키보드 문제는 layout viewport와 Visual Viewport를 구분해 진단한다.
- Visual Viewport의 `offsetTop`을 포커스 전환 중 고정 레이어 위치로 사용하지 않는다.
- 일반 모달의 body 고정 정책을 입력 중심의 전체 화면 overlay에 그대로 적용하지 않는다.
- 이벤트 시점의 레이아웃 치수로 전환 전 상태를 추정하지 않는다.
- iOS 회귀 테스트에는 `resize`, `scroll`과 레이아웃 변경 순서를 각각 바꾼 사례를 포함한다.
- 사용자 스크롤을 보정할 때는 전환 전에 하단에 있었던 경우만 이동한다.
- 글꼴 fallback은 family 이름만 확인하지 않고 실제 언어 글리프가 포함됐는지 확인한다.

## 관련 커밋

| 커밋      | 확인한 문제 또는 결정                                                |
| --------- | -------------------------------------------------------------------- |
| `9349924` | 모바일 스크롤 잠금 분리의 시작, iOS 입력 확대와 배경 비침 대응       |
| `388aa78` | `offsetTop` 중간값 제외와 터치 Safari 폼 글꼴 16px 보장              |
| `8fb03ba` | Visual Viewport scroll 중간값을 레이아웃 계산에서 제외               |
| `ceb6999` | Chromium `interactive-widget=resizes-content`와 Safari fallback 분리 |
| `b881469` | JavaScript와 Safari 기본 동작의 이중 보정 제거 시도                  |
| `1034377` | 챗봇의 body 고정 해제와 Visual Viewport height 동기화 분리           |
| `98e835a` | iOS root·body·overlay 높이 동기화와 문서 팬 상쇄                     |
| `5ea2ee8` | viewport 축소 뒤 메시지 하단 상태 유지                               |
| `11fbed6` | 키보드 종료 후 작은 height 오차 정규화                               |
| `85c21d2` | `scroll`·`scrollend` 종료 순서 지원과 Noto Serif KR fallback         |
| `93dde5f` | 이벤트 이전에 저장한 메시지 하단 상태 사용                           |
| `c425d84` | 관련 모바일 UI 정렬 보완과 문서화 의도가 기록된 마지막 커밋          |
