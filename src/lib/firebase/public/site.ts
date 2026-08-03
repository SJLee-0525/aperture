import { COLLECTIONS, SITE_DOC } from "@/constants/collections";

import { fetchDocument } from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";

import type { SiteConfig, SiteLink } from "@/types/site";
import type { Tag } from "@/types/tag";

const toSiteConfig = (data: Record<string, unknown>): SiteConfig => ({
  name: asText(data.name),
  tagline: asText(data.tagline),
  landingLead: asText(data.landingLead),
  contactLead: asText(data.contactLead),
  bio: asText(data.bio),
  links: (data.links as SiteLink[]) ?? [],
  tags: (data.tags as Tag[]) ?? [],
});

const fetchSiteConfig = async (options?: { fresh?: boolean }): Promise<SiteConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_DOC, "site", options);
  return data ? toSiteConfig(data) : null;
};

export { fetchSiteConfig, toSiteConfig };
