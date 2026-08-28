/**
 * 커서와 스크롤바가 서로를 알아보는 DOM 계약.
 *
 * 두 컴포넌트는 서로를 import 하지 않는다. 커서는 스크롤바 위에 오면 모양을 바꾸고,
 * 스크롤바는 커서가 정한 accent 를 이어받는다. 그 연결이 전부 이 이름들이라서, 값을
 * 각자 하드코딩하면 ESLint 도 dependency-cruiser 도 끊어진 것을 보지 못한다.
 *
 * 이름을 바꿀 때는 짝이 되는 CSS 도 함께 고쳐야 한다. CSS 는 이 상수를 읽을 수 없다.
 */

/** 커스텀 커서가 켜진 문서. `globals.css` 가 이 표시로 네이티브 커서를 걷는다. */
const DATA_CUSTOM_CURSOR = "data-custom-cursor";

/** 커서 요소 자신. 스크롤바가 이 요소를 자기 대상에서 제외한다. */
const DATA_CURSOR_UI = "data-custom-cursor-ui";

/** 커서가 면칠로 감싼 요소. 각 컴포넌트의 배경형 :hover 가 이 표시로 자신을 끈다. */
const DATA_CURSOR_SNAPPED = "data-cursor-snapped";

/** 세로 스크롤바 막대. 커서가 이 위에서 스크롤바 모양이 된다. */
const DATA_SCROLLBAR_UI = "data-custom-scrollbar-ui";

/** 가로 스크롤 영역의 막대. 세로와 같은 모양을 축만 눕혀 쓴다. */
const DATA_HORIZONTAL_SCROLLBAR_UI = "data-custom-horizontal-scrollbar-ui";

/** 스크롤바가 자기 대상으로 삼는 컨테이너. 모달과 지역 스크롤러가 이 표시를 단다. */
const DATA_SCROLL_CONTAINER = "data-custom-scroll-container";

/** 커서가 정하고 스크롤바가 이어받는 색. */
const CURSOR_ACCENT_VAR = "--cursor-accent";

export {
  CURSOR_ACCENT_VAR,
  DATA_CURSOR_SNAPPED,
  DATA_CURSOR_UI,
  DATA_CUSTOM_CURSOR,
  DATA_HORIZONTAL_SCROLLBAR_UI,
  DATA_SCROLLBAR_UI,
  DATA_SCROLL_CONTAINER,
};
