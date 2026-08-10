// Next.js 서버 계측 진입점 — 런타임별 Sentry 초기화와 요청 오류 훅.
// 여기의 정적 import는 서버 번들에만 들어간다. 클라이언트 쪽 규칙(정적 import 금지)은
// instrumentation-client.ts 참고.

import * as Sentry from "@sentry/nextjs";

/**
 * 서버 기동 시 런타임에 맞는 Sentry 설정을 로드한다.
 *
 * @returns {Promise<void>} 초기화 완료.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// RSC 렌더·Route Handler·server action의 미처리 오류를 Sentry로 전달한다.
export const onRequestError = Sentry.captureRequestError;
