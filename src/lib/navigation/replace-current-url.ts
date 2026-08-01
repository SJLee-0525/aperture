/**
 * 현재 history entry의 URL만 바꾸고 App Router의 useSearchParams를 동기화한다.
 *
 * Next 16에서 정적 페이지 딥링크로 바로 진입한 경우 같은 pathname에 대한
 * router.replace가 no-op이 되어 native history API를 사용한다. 현재 webpack 개발·E2E
 * 환경에서는 native history 변경만으로 useSearchParams가 갱신되지 않아 popstate를 전달한다.
 */
const replaceCurrentUrl = (href: string): void => {
  window.history.replaceState(window.history.state, "", href);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
};

/**
 * 새 history entry로 URL을 추가하고 App Router의 useSearchParams를 동기화한다.
 * 목록→모달 진입처럼 뒤로가기가 모달을 닫아야 하는 경우에 사용한다.
 */
const pushCurrentUrl = (href: string): void => {
  window.history.pushState(window.history.state, "", href);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
};

export { pushCurrentUrl, replaceCurrentUrl };
