/**
 * Next.js 클라이언트 계측 진입점 — 모든 클라이언트 진입에서 실행된다.
 *
 * ★ `@sentry/nextjs` 정적 import 금지(ADR-0004). 여기서 SDK를 참조하면 동의 여부와
 * 무관하게 초기 번들에 들어가 동의 게이팅이 무의미해진다. 이 파일은 "이미 로드된
 * SDK로 포워딩하는 함수"만 내보내고, SDK 로드는 동의 뒤
 * `lib/monitoring/browser-monitoring.ts`(컨트롤러)가 dynamic import로 수행한다.
 * type-only import는 컴파일 시 사라지므로 예외다.
 */

type SentryModule = typeof import("@sentry/nextjs");

/** 동의 후 컨트롤러가 채우는 SDK 모듈. 동의 전·철회 후에는 null이다. */
let loaded: SentryModule | null = null;

/**
 * 컨트롤러가 SDK 로드/해제 시 포워딩 대상을 갱신한다.
 *
 * @param {SentryModule | null} module - 로드된 SDK 모듈, 철회 시 `null`.
 * @returns {void}
 */
const setLoadedSentry = (module: SentryModule | null): void => {
  loaded = module;
};

/**
 * App Router 클라이언트 내비게이션 시작을 SDK에 전달한다. SDK 미로드 시 no-op.
 *
 * @param {Parameters<SentryModule["captureRouterTransitionStart"]>} args - href·navigationType.
 * @returns {void}
 */
export const onRouterTransitionStart = (
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
): void => {
  loaded?.captureRouterTransitionStart(...args);
};

/**
 * 로드된 SDK가 있을 때만 오류를 전송한다. Provider 밖(global-error 등)에서 사용한다.
 *
 * @param {unknown} error - 포착한 오류.
 * @returns {void}
 */
const captureExceptionIfLoaded = (error: unknown): void => {
  loaded?.captureException(error);
};

export { captureExceptionIfLoaded, setLoadedSentry };
export type { SentryModule };
