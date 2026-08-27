import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 서명 계산 전에 거절할 본문 크기. 실측 페이로드는 수십 KB 수준이라 여유가 크다.
 * Vercel 이 훨씬 큰 값에서 자르지만 그것과 별개로 우리 상한을 둔다.
 */
const MAX_WEBHOOK_BODY_BYTES = 262_144;

const SIGNATURE_HEADER = "sentry-hook-signature";

type WebhookRejection =
  "body-too-large" | "missing-secret" | "missing-signature" | "signature-mismatch";

type WebhookGate = { ok: true } | { ok: false; reason: WebhookRejection };

/**
 * hex 문자열 두 개를 길이 정보만 노출하는 방식으로 비교한다.
 * 길이가 다르면 `timingSafeEqual` 이 예외를 던지므로 먼저 거른다.
 */
const equalsSignature = (expected: string, received: string): boolean => {
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
};

/**
 * Sentry 웹훅 서명을 검증한다.
 *
 * 서명 대상은 Sentry 가 직렬화한 **본문 문자열 원문**이다. `request.json()` 으로 파싱한 뒤
 * 다시 `JSON.stringify` 한 값으로 검증하면 키 순서나 공백 차이로 해시가 어긋나
 * 정상 요청이 전부 거절된다.
 *
 * 타임스탬프 헤더는 서명 대상이 아니라 신선도 검증에 쓸 수 없다. 재전송과 재생은
 * 저장 계층의 `(issue_id, event_id)` 멱등성이 막는다.
 *
 * 크기를 여기서 다시 잰다. `Content-Length` 는 `Transfer-Encoding: chunked` 요청에 없어서
 * 헤더 검사만으로는 상한이 강제되지 않고, 비인증 요청이 전량 버퍼링과 HMAC 계산까지 도달한다.
 *
 * @param rawBody `request.text()` 로 받은 원문.
 * 서명 대상은 본문뿐이다. Sentry 가 함께 보내는 `sentry-hook-timestamp` 는 HMAC 밖에 있어
 * 재생하는 쪽이 임의로 고쳐 쓸 수 있다. 신선도 검사를 붙여도 재생을 막지 못하므로 두지 않는다.
 * 같은 전달을 두 번 처리하지 않게 하는 것은 `claimSentryAlert` 의 멱등 키다.
 *
 * @param headers 요청 헤더.
 * @param secret 통합의 Client Secret.
 * @param max 허용 바이트 수.
 * @returns 통과 여부와 거절 사유.
 */
const verifySentrySignature = (
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
  max = MAX_WEBHOOK_BODY_BYTES,
): WebhookGate => {
  // 모듈 불변식이다. 지금 유일한 호출부(sentry-alert route)는 readLimitedBody 로 이미
  // 절단한 본문을 넘기므로 여기서 참이 되지 않는다. 다른 호출자가 생겨도 서명 계산 전에
  // 걸리도록 남긴다. 상한은 바이트 기준이다 — String.length 는 UTF-16 코드 유닛 수라
  // 한글 본문을 1/3 로 센다.
  if (Buffer.byteLength(rawBody, "utf8") > max) return { ok: false, reason: "body-too-large" };

  const normalizedSecret = secret?.trim();
  if (!normalizedSecret) return { ok: false, reason: "missing-secret" };

  const received = headers.get(SIGNATURE_HEADER)?.trim().toLowerCase();
  if (!received) return { ok: false, reason: "missing-signature" };

  const expected = createHmac("sha256", normalizedSecret).update(rawBody, "utf8").digest("hex");

  return equalsSignature(expected, received)
    ? { ok: true }
    : { ok: false, reason: "signature-mismatch" };
};

export { MAX_WEBHOOK_BODY_BYTES, verifySentrySignature };
