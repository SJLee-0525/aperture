/**
 * gtag.js 브리지 — 전역 `window.gtag` 타입과 page_view 전송을 한곳에 둔다.
 *
 * ⚠️ 초기 page_view 는 `gtag('config', …, { send_page_view: false })` 로 꺼져 있다.
 * App Router 의 클라이언트 내비게이션에서 제목·경로가 갱신된 뒤에 직접 보내야
 * page_title 이 이전 페이지 것으로 기록되지 않기 때문이다(자동 수집의 고질적 오차).
 */

type GtagFn = (command: "config" | "event" | "js" | "set", ...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

/** `url` 은 쿼리까지 포함한 경로(`/ko/photo?photo=abc`) — 모달 딥링크도 개별 조회로 잡힌다. */
const sendPageView = (url: string) => {
  window.gtag?.("event", "page_view", {
    page_location: `${window.location.origin}${url}`,
    page_title: document.title,
  });
};

export { sendPageView };
