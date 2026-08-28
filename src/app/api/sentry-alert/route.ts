import { after } from "next/server";

import { declaredBodyTooLarge, readLimitedBody } from "@/lib/http/read-limited-body";
import {
  handleSentryAlert,
  sentryAlertDependencies,
} from "@/lib/sentry-triage/handle-sentry-alert";
import {
  MAX_WEBHOOK_BODY_BYTES,
  verifySentrySignature,
} from "@/lib/sentry-triage/verify-sentry-signature";


/** `node:crypto` 의 `timingSafeEqual` 이 필요하다. */
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sentry issue alert 웹훅을 받는다 (ADR-0006, docs/plan/10).
 *
 * 경로가 `/api/monitoring/*` 이 아닌 이유는 `/monitoring` 을 Sentry 브라우저 터널이
 * 이미 쓰고 있어서다(`next.config.ts` 의 `tunnelRoute`).
 *
 * 응답에 본문을 싣지 않는다. 독자가 Sentry 의 전달 로그이고 상태 코드만 읽는다.
 * 관리자 라우트는 관리자 화면이 문구를 그대로 보여 주므로 `{ error: "한국어" }`,
 * 공개 GET 은 `{ error: "<Noun> not found" }`, 챗은 클라이언트가 코드로 분기해
 * `{ error: { code, message } }` 다. 네 부류의 독자가 서로 다르다.
 *
 * 서명 검증까지만 동기로 하고 나머지는 응답 이후로 미룬다. Sentry 는 응답이 늦으면
 * 실패로 보고 재전송하는데, LLM 호출을 기다리면 그 시간을 넘긴다.
 *
 * @param request 서명된 웹훅 요청.
 * @returns 검증 실패는 401·413, 접수는 202.
 */
export async function POST(request: Request): Promise<Response> {
  if (declaredBodyTooLarge(request.headers, MAX_WEBHOOK_BODY_BYTES)) {
    return new Response(null, { status: 413 });
  }

  // Content-Length 선검사는 chunked 요청에 헤더가 없어 통과시킨다. 본문을 통째로 읽은 뒤
  // 크기를 재면 그 사이에 상한을 넘는 본문이 이미 메모리에 올라간다.
  const raw = await readLimitedBody(request, MAX_WEBHOOK_BODY_BYTES);
  if (raw === null) return new Response(null, { status: 413 });

  const gate = verifySentrySignature(raw, request.headers, process.env.SENTRY_ALERT_WEBHOOK_SECRET);
  if (!gate.ok) {
    // "body-too-large" 는 여기 오지 않는다. readLimitedBody 가 상한 초과를 null 로
    // 돌려주고 그 자리에서 413 으로 끊는다.
    // 시크릿 미설정은 배포 실수라 인증 실패와 구분해 로그에 남긴다.
    if (gate.reason === "missing-secret") {
      console.error("[sentry-alert] SENTRY_ALERT_WEBHOOK_SECRET is not configured");
    }
    return new Response(null, { status: 401 });
  }

  after(() => handleSentryAlert(raw, sentryAlertDependencies()));
  return new Response(null, { status: 202 });
}
