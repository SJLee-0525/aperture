/**
 * 제공자마다 다른 실패 신호를 한 가지 타입으로 정규화한다.
 * 라우트 핸들러는 kind 만 보고 공개 오류를 결정하므로, 제공자를 교체하거나
 * 새로 추가해도 핸들러를 고칠 필요가 없다.
 */
type ChatUpstreamErrorKind = "rate-limit" | "unavailable" | "blocked" | "invalid";

class ChatUpstreamError extends Error {
  readonly kind: ChatUpstreamErrorKind;

  constructor(kind: ChatUpstreamErrorKind, message: string) {
    super(message);
    this.name = "ChatUpstreamError";
    this.kind = kind;
  }
}

/**
 * HTTP 상태를 공통 규칙으로 분류한다. 두 제공자가 같은 상태에 같은 kind 를 쓰게 해
 * 메인·서브를 바꿔도 공개 오류 코드가 달라지지 않도록 한다.
 *
 * @param {string} providerLabel
 * @param {Response} response
 * @returns {void}
 */
const assertUpstreamResponseOk = (providerLabel: string, response: Response) => {
  if (response.ok) return;
  if (response.status === 429) {
    throw new ChatUpstreamError("rate-limit", `${providerLabel} rate limit exceeded`);
  }
  if (response.status >= 500) {
    throw new ChatUpstreamError("unavailable", `${providerLabel} service unavailable`);
  }
  throw new ChatUpstreamError("invalid", `${providerLabel} request failed (${response.status})`);
};

export { assertUpstreamResponseOk, ChatUpstreamError };
