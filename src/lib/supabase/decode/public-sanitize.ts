import { normalizePublicHref, sanitizePublicLinks } from "@/lib/security/public-url";

import type { DevProject } from "@/types/dev";
import type { MusicWork } from "@/types/music";
import type { SiteConfig } from "@/types/site";

/**
 * 공개 표면에만 적용하는 정화.
 *
 * 디코더는 저장된 주소를 원문 그대로 돌려준다. 읽기에서 정화하면 관리자 폼이 그 빈 값을
 * 다시 저장하고, 전체 문서를 되쓰는 경로도 원본을 지운다. 그래서 정화는 공개 fetcher 뒤에
 * 한 겹으로 붙이고 관리자 경로는 디코더만 쓴다.
 */

/** 예매 링크가 실행 가능한 스킴이면 빈 값이 되어 버튼이 그려지지 않는다. */
const sanitizeMusicWorkForPublic = (work: MusicWork): MusicWork => ({
  ...work,
  ticketUrl: normalizePublicHref(work.ticketUrl),
});

const sanitizeDevProjectForPublic = (project: DevProject): DevProject => ({
  ...project,
  links: sanitizePublicLinks(project.links),
});

/** 연락 링크는 `mailto:` 를 허용한다. 연락 페이지의 기본 수단이다. */
const sanitizeSiteConfigForPublic = (config: SiteConfig): SiteConfig => ({
  ...config,
  links: sanitizePublicLinks(config.links, { allowMailto: true }),
});

export { sanitizeDevProjectForPublic, sanitizeMusicWorkForPublic, sanitizeSiteConfigForPublic };
