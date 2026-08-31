const SECRET_TOKEN_PATTERN = /\b(?:AIza[\w-]{20,}|gh[opsu]_[\w]{20,})\b/g;
const LABELLED_SECRET_PATTERN = /(api[_-]?key|token|webhook)(\s*[=:]\s*)[^\s]+/gi;
const URL_PATTERN = /https?:\/\/[^\s?#]+[^\s]*/gi;

/**
 * URL 을 origin 까지만 남긴다.
 *
 * Discord 웹훅은 시크릿을 query 가 아니라 path 에 둔다
 * (`https://discord.com/api/webhooks/{id}/{token}`). path 를 남기면 그 토큰이 그대로 로그에
 * 실리므로, 어느 서비스가 실패했는지만 남기고 나머지는 버린다. 구체적인 실패 사유는
 * 호출자의 오류 메시지가 상태 코드와 함께 이미 담고 있다.
 */
const urlToOrigin = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return "[redacted-url]";
  }
};

/**
 * 외부 오류 메시지에서 시크릿 형태를 지운다. CI 로그와 Actions summary 로 나가는 문자열에 쓴다.
 *
 * @param value 오류 객체 또는 문자열. Error 가 아니면 String() 결과를 쓴다.
 * @returns URL 은 origin 까지만 남고 알려진 키 형태는 치환된 문자열.
 */
const redactSecrets = (value: unknown): string => {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(URL_PATTERN, urlToOrigin)
    .replace(SECRET_TOKEN_PATTERN, "[redacted-secret]")
    .replace(LABELLED_SECRET_PATTERN, "$1$2[redacted-secret]");
};

export { redactSecrets };
