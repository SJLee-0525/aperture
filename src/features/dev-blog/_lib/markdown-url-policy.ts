import { STORAGE_IMAGE_HOSTS } from "@/constants/security-headers";
import { normalizePublicHref } from "@/lib/security/public-url";

import type { ArticleLinkTarget } from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 본문 링크를 실행 가능한 스킴에서 걸러 낸다.
 *
 * 사이트의 다른 공개 링크와 같은 판정을 쓰려고 `normalizePublicHref` 를 그대로 재사용한다.
 * 즉 외부 주소는 HTTPS 만 통과한다 — 계획 문서는 `http:` 도 적었지만 정책을 두 벌 두면
 * 한쪽만 느슨해지고, 전역 CSP 의 `upgrade-insecure-requests` 가 어차피 HTTPS 로 올린다.
 * `javascript:`·`data:`·프로토콜 상대 주소(`//host`)는 여기서 전부 빈 문자열이 된다.
 *
 * @param raw Markdown 이 준 링크 주소.
 * @returns 허용된 링크, 아니면 null.
 */
const resolveArticleLink = (raw: string): { href: string; target: ArticleLinkTarget } | null => {
  const href = normalizePublicHref(raw, { allowMailto: true });
  if (!href) return null;

  if (href.startsWith("/") || href.startsWith("#")) return { href, target: "internal" };
  if (href.toLowerCase().startsWith("mailto:")) return { href, target: "mail" };
  return { href, target: "external" };
};

/**
 * 본문 이미지 출처를 관리자 Storage 로 제한한다.
 *
 * 임의 외부 이미지를 허용하면 방문자의 요청이 그 호스트로 나가 IP 와 방문 시각이 새고,
 * CSP `img-src` 에 없는 주소는 어차피 브라우저가 막아 빈 칸만 남는다.
 *
 * @param raw Markdown 이 준 이미지 주소.
 * @returns 허용된 주소, 아니면 null.
 */
const resolveArticleImageSource = (raw: string): string | null => {
  const source = raw.trim();
  if (!source) return null;

  try {
    const url = new URL(source);
    const allowed = STORAGE_IMAGE_HOSTS.some((host) => host === url.origin);
    return allowed && !url.username && !url.password ? source : null;
  } catch {
    return null;
  }
};

export { resolveArticleImageSource, resolveArticleLink };
