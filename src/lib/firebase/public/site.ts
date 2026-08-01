import { COLLECTIONS, SITE_DOC } from "@/constants/collections";
import { fetchDocument } from "@/lib/firebase/public/transport";
import type { LocalizedText } from "@/types/localized";
import type { SiteConfig, SiteLink } from "@/types/site";
import type { Tag } from "@/types/tag";

const EMPTY_LOCALIZED: LocalizedText = { ko: "", en: "" };

const fetchSiteConfig = async (): Promise<SiteConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_DOC, "site");
  if (!data) return null;
  return {
    name: (data.name as LocalizedText) ?? EMPTY_LOCALIZED,
    tagline: (data.tagline as LocalizedText) ?? EMPTY_LOCALIZED,
    landingLead: (data.landingLead as LocalizedText) ?? EMPTY_LOCALIZED,
    contactLead: (data.contactLead as LocalizedText) ?? EMPTY_LOCALIZED,
    bio: (data.bio as LocalizedText) ?? EMPTY_LOCALIZED,
    links: (data.links as SiteLink[]) ?? [],
    tags: (data.tags as Tag[]) ?? [],
  };
};

export { fetchSiteConfig };
