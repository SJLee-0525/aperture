/**
 * gtag.js 브리지 — 전역 `window.gtag` 타입과 page_view 전송을 한곳에 둔다.
 *
 * ⚠️ 초기 page_view 는 `gtag('config', …, { send_page_view: false })` 로 꺼져 있다.
 * App Router 의 클라이언트 내비게이션에서 제목·경로가 갱신된 뒤에 직접 보내야
 * page_title 이 이전 페이지 것으로 기록되지 않기 때문이다(자동 수집의 고질적 오차).
 */

type GtagFn = (command: "config" | "consent" | "event" | "js" | "set", ...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

/**
 * Google tag를 요청하기 전에 dataLayer 큐를 준비해 초기 설정 유실을 막는다.
 */
const prepareGoogleAnalytics = (): void => {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });
};

/**
 * 명시적 분석 동의 뒤에 GA4를 구성한다. 광고 저장과 개인화는 항상 거부한다.
 *
 * Basic Consent Mode의 순서에 맞춰 기본값을 거부로 둔 다음, 분석 저장만 허용으로 갱신한다.
 * 철회 후 재허용할 때도 `update`가 다시 실행되므로 이전의 거부 상태가 남지 않는다.
 *
 * @param measurementId - `G-`로 시작하는 GA4 측정 ID.
 */
const configureGoogleAnalytics = (measurementId: string): void => {
  prepareGoogleAnalytics();
  window.gtag?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag?.("js", new Date());
  window.gtag?.("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
};

/**
 * 현재 경로에서 읽을 수 있는 쿠키의 만료를 요청한다.
 *
 * @param name - 삭제할 쿠키 이름.
 * @param domain - 도메인 속성이 있는 쿠키를 위한 선택적 호스트명.
 */
const expireCookie = (name: string, domain?: string): void => {
  const domainPart = domain ? `; Domain=${domain}` : "";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domainPart}`;
};

/**
 * 철회 즉시 이후 측정을 막고 현재 origin에서 접근 가능한 GA 쿠키 삭제를 시도한다.
 */
const disableGoogleAnalytics = (): void => {
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  try {
    const names = document.cookie
      .split(";")
      .map((cookie) => cookie.split("=")[0]?.trim())
      .filter((name): name is string =>
        Boolean(name && (name === "_ga" || name.startsWith("_ga_"))),
      );
    for (const name of names) {
      expireCookie(name);
      expireCookie(name, window.location.hostname);
    }
  } catch {
    // 쿠키 제거가 차단돼도 consent update와 이후 이벤트 중단은 유지한다.
  }
};

/**
 * `url` 은 쿼리까지 포함한 경로(`/ko/photo?photo=abc`) — 모달 딥링크도 개별 조회로 잡힌다.
 */
const sendPageView = (url: string): void => {
  window.gtag?.("event", "page_view", {
    page_location: `${window.location.origin}${url}`,
    page_title: document.title,
  });
};

export { configureGoogleAnalytics, disableGoogleAnalytics, prepareGoogleAnalytics, sendPageView };
