import { absoluteUrl } from "@/lib/seo/site-url";

/** RFC 9116 security.txt 원문. 마지막 빈 문자열은 POSIX 줄바꿈을 보장한다. */
const body = [
  `Contact: ${absoluteUrl("/en/contact")}`,
  "Preferred-Languages: ko, en",
  "Expires: 2027-02-10T00:00:00.000Z",
  `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
  "",
].join("\n");

/**
 * 보안 취약점 신고에 필요한 연락처와 문서 만료일을 평문으로 제공한다.
 *
 * @returns {Response} 하루 동안 캐시 가능한 UTF-8 security.txt 응답.
 */
export function GET(): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
