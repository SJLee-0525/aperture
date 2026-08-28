import { readLinks, readObjects, readString, readText } from "@/lib/supabase/decode/field";

import type { SiteConfig } from "@/types/site";
import type { Tag } from "@/types/tag";

/** 태그 사전. `id` 가 없는 항목은 사진이 참조할 수 없어 버린다. */
const readTags = (value: unknown): Tag[] =>
  readObjects(value)
    .filter((item) => typeof item.id === "string" && item.id !== "")
    .map((item) => ({
      id: readString(item.id),
      ko: readString(item.ko),
      en: readString(item.en),
    }));

/**
 * @param data 병합된 사이트 설정 필드.
 */
const decodeSiteConfig = (data: Record<string, unknown>): SiteConfig => ({
  name: readText(data.name),
  tagline: readText(data.tagline),
  landingLead: readText(data.landingLead),
  contactLead: readText(data.contactLead),
  bio: readText(data.bio),
  links: readLinks(data.links),
  tags: readTags(data.tags),
});

export { decodeSiteConfig };
