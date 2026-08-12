/**
 * 현재 history entry의 URL만 바꾸고 App Router의 useSearchParams를 동기화한다.
 *
 * Next 16에서 정적 페이지 딥링크로 바로 진입한 경우 같은 pathname에 대한
 * router.replace가 no-op이 되어 native history API를 사용한다. 현재 webpack 개발·E2E
 * 환경에서는 native history 변경만으로 useSearchParams가 갱신되지 않아 popstate를 전달한다.
 *
 * @param {string} href
 * @returns {void}
 */
const replaceCurrentUrl = (href: string): void => {
  window.history.replaceState(window.history.state, "", href);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
};

/**
 * 새 history entry로 URL을 추가하고 App Router의 useSearchParams를 동기화한다.
 * 목록→모달 진입처럼 뒤로가기가 모달을 닫아야 하는 경우에 사용한다.
 *
 * 기본값은 현재 state를 그대로 옮긴다 — App Router가 그 안에 라우팅 정보를 들고 있다.
 * 다만 **떠나는 entry에만 남겨야 할 값**(예: 이동 직전 스크롤 위치)을 방금 현재 state에
 * 적었다면, 그 값을 뺀 state를 넘겨야 한다. 그대로 두면 새 entry가 같은 값을 물려받아
 * 앞으로 가기에서도 복원이 돌아 엉뚱한 곳으로 되돌아간다.
 *
 * @param {string} href
 * @param {unknown} [state] 새 entry에 넣을 state. 생략하면 현재 state를 그대로 쓴다.
 * @returns {void}
 */
const pushCurrentUrl = (href: string, state: unknown = window.history.state): void => {
  window.history.pushState(state, "", href);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
};

export { pushCurrentUrl, replaceCurrentUrl };
