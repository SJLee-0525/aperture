import { normalizeDevAwards } from "@/lib/content/normalize-dev-awards";
import { normalizeTroubleshooting } from "@/lib/content/normalize-troubleshooting";
import {
  readBoolean,
  readImageArray,
  readImageOrNull,
  readNumber,
  readString,
  readStringArray,
  readText,
} from "@/lib/supabase/decode/field";

import type { DevConfig, DevProject, DevStackGroup, DevTimelineEntry } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";
import type { TimelineEntry } from "@/types/timeline";

const objects = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
      )
    : [];

const readTextArray = (value: unknown): LocalizedText[] => objects(value).map(readText);

/** 저장된 링크를 원문 그대로 읽는다. 공개 표시용 정화는 `sanitizeForPublic` 이 한다. */
const readLinks = (value: unknown): SiteLink[] =>
  objects(value).map((item) => ({ label: readString(item.label), href: readString(item.href) }));

const readInterview = (value: unknown): DevConfig["interview"] =>
  objects(value).map((item) => ({ q: readText(item.q), a: readText(item.a) }));

const readStack = (value: unknown): DevStackGroup[] =>
  objects(value).map((group) => ({
    category: readString(group.category),
    items: objects(group.items).map((item) => ({
      name: readString(item.name),
      bg: readString(item.bg),
      fg: readString(item.fg),
    })),
  }));

const readEducation = (value: unknown): TimelineEntry[] =>
  objects(value).map((item) => ({ period: readString(item.period), title: readText(item.title) }));

const readDevTimeline = (value: unknown): DevTimelineEntry[] =>
  objects(value).map((item) => ({
    period: readString(item.period),
    title: readText(item.title),
    role: readText(item.role),
    desc: readText(item.desc),
  }));

/**
 * 병합된 프로젝트 행을 도메인 모델로 바꾼다.
 *
 * 구형 평문 `troubleshooting` 은 `normalizeTroubleshooting` 이 구조화 형태로 맞춘다.
 *
 * @param {string} id 프로젝트 문서 ID.
 * @param {Record<string, unknown>} data 병합된 프로젝트 문서 필드.
 * @returns {DevProject}
 */
const decodeDevProject = (id: string, data: Record<string, unknown>): DevProject => ({
  id,
  title: readText(data.title),
  category: readText(data.category),
  year: readString(data.year),
  period: readText(data.period),
  position: readText(data.position),
  summary: readText(data.summary),
  overview: readText(data.overview),
  features: readTextArray(data.features),
  roles: readTextArray(data.roles),
  troubleshooting: normalizeTroubleshooting(data.troubleshooting),
  achievements: readTextArray(data.achievements),
  techTags: readStringArray(data.techTags),
  links: readLinks(data.links),
  cover: readImageOrNull(data.cover),
  images: readImageArray(data.images),
  order: readNumber(data.order),
  published: readBoolean(data.published),
});

/**
 * @param {Record<string, unknown>} data 병합된 개발 설정 필드.
 * @returns {DevConfig}
 */
const decodeDevConfig = (data: Record<string, unknown>): DevConfig => ({
  heroLead: readText(data.heroLead),
  interview: readInterview(data.interview),
  stack: readStack(data.stack),
  education: readEducation(data.education),
  timeline: readDevTimeline(data.timeline),
  awards: normalizeDevAwards(data.awards),
});

export { decodeDevConfig, decodeDevProject };
