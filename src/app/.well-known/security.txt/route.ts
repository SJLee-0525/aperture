import { absoluteUrl } from "@/lib/seo/site-url";

/**
 * RFC 9116 은 `Expires` 가 미래 시각이어야 한다고 요구한다. 날짜를 고정해 두면 그날이
 * 지난 뒤 스캐너와 신고자가 이 파일을 무효로 처리하는 것을 아무도 모른 채 지나간다.
 * 배포 시각에서 계산해 재배포마다 갱신되게 한다.
 */
const EXPIRES_DAYS = 180;

/**
 * 배포 시각에서 만료일을 계산한다.
 *
 * @param [from] 기준 시각. 테스트가 고정할 수 있게 주입받는다.
 * @returns RFC 9116 `Expires` 값.
 */
const expiresAt = (from: Date = new Date()): string =>
  new Date(from.getTime() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();

/** RFC 9116 security.txt 원문. 마지막 빈 문자열은 POSIX 줄바꿈을 보장한다. */
const body = [
  `Contact: ${absoluteUrl("/en/contact")}`,
  "Preferred-Languages: ko, en",
  `Expires: ${expiresAt()}`,
  `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
  "",
].join("\n");

/**
 * 보안 취약점 신고에 필요한 연락처와 문서 만료일을 평문으로 제공한다.
 *
 * @returns 하루 동안 캐시 가능한 UTF-8 security.txt 응답.
 */
export { expiresAt };

export function GET(): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
