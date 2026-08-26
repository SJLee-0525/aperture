import { readString, readText } from "@/lib/supabase/decode/field";

import type { SiteConfig, SiteLink } from "@/types/site";
import type { Tag } from "@/types/tag";

const objects = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
      )
    : [];

/** 저장된 링크를 원문 그대로 읽는다. 공개 표시용 정화는 `sanitizeForPublic` 이 한다. */
const readLinks = (value: unknown): SiteLink[] =>
  objects(value).map((item) => ({ label: readString(item.label), href: readString(item.href) }));

/** 태그 사전. `id` 가 없는 항목은 사진이 참조할 수 없어 버린다. */
const readTags = (value: unknown): Tag[] =>
  objects(value)
    .filter((item) => typeof item.id === "string" && item.id !== "")
    .map((item) => ({
      id: readString(item.id),
      ko: readString(item.ko),
      en: readString(item.en),
    }));

/**
 * @param {Record<string, unknown>} data 병합된 사이트 설정 필드.
 * @returns {SiteConfig}
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
