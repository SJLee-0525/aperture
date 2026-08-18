import { after } from "next/server";

import {
  handleSentryAlert,
  sentryAlertDependencies,
} from "@/features/sentry-triage/_lib/handle-sentry-alert";
import {
  declaredBodyTooLarge,
  verifySentrySignature,
} from "@/features/sentry-triage/_lib/verify-sentry-signature";

/** `node:crypto` 의 `timingSafeEqual` 이 필요하다. */
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sentry issue alert 웹훅을 받는다 (ADR-0006, docs/plan/10).
 *
 * 경로가 `/api/monitoring/*` 이 아닌 이유는 `/monitoring` 을 Sentry 브라우저 터널이
 * 이미 쓰고 있어서다(`next.config.ts` 의 `tunnelRoute`).
 *
 * 서명 검증까지만 동기로 하고 나머지는 응답 이후로 미룬다. Sentry 는 응답이 늦으면
 * 실패로 보고 재전송하는데, LLM 호출을 기다리면 그 시간을 넘긴다.
 *
 * @param {Request} request 서명된 웹훅 요청.
 * @returns {Promise<Response>} 검증 실패는 401·413, 접수는 202.
 */
export async function POST(request: Request): Promise<Response> {
  if (declaredBodyTooLarge(request.headers)) {
    return new Response(null, { status: 413 });
  }

  const raw = await request.text();
  const gate = verifySentrySignature(raw, request.headers, process.env.SENTRY_ALERT_WEBHOOK_SECRET);
  if (!gate.ok) {
    // chunked 요청은 Content-Length 가 없어 위 선검사를 지나온다. 크기 거절은 여기서 나온다.
    if (gate.reason === "body-too-large") return new Response(null, { status: 413 });
    // 시크릿 미설정은 배포 실수라 인증 실패와 구분해 로그에 남긴다.
    if (gate.reason === "missing-secret") {
      console.error("[sentry-alert] SENTRY_ALERT_WEBHOOK_SECRET is not configured");
    }
    return new Response(null, { status: 401 });
  }

  after(() => handleSentryAlert(raw, sentryAlertDependencies()));
  return new Response(null, { status: 202 });
}
