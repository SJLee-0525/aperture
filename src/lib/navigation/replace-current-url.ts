/**
 * 현재 history entry의 URL만 바꾸고 App Router의 useSearchParams를 동기화한다.
 *
 * Next 16에서 정적 페이지 딥링크로 바로 진입한 경우 같은 pathname에 대한
 * router.replace가 no-op이 됐다. replaceState는 popstate를 자동 발생시키지 않으므로
 * 동일 state로 이벤트를 전달한다. Next 메이저 업그레이드 때 직접 진입 모달 E2E로 재검증할 것.
 */
const replaceCurrentUrl = (href: string): void => {
  window.history.replaceState(window.history.state, "", href);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
};

export { replaceCurrentUrl };
