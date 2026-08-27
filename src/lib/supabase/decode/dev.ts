import { normalizeDevAwards } from "@/lib/content/normalize-dev-awards";
import { normalizeTroubleshooting } from "@/lib/content/normalize-troubleshooting";
import {
  readBoolean,
  readImageArray,
  readImageOrNull,
  readLinks,
  readNumber,
  readObjects,
  readString,
  readStringArray,
  readText,
  readTimeline,
} from "@/lib/supabase/decode/field";

import type { DevConfig, DevProject, DevStackGroup, DevTimelineEntry } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";

const readTextArray = (value: unknown): LocalizedText[] => readObjects(value).map(readText);

const readInterview = (value: unknown): DevConfig["interview"] =>
  readObjects(value).map((item) => ({ q: readText(item.q), a: readText(item.a) }));

const readStack = (value: unknown): DevStackGroup[] =>
  readObjects(value).map((group) => ({
    category: readString(group.category),
    items: readObjects(group.items).map((item) => ({
      name: readString(item.name),
      bg: readString(item.bg),
      fg: readString(item.fg),
    })),
  }));

const readDevTimeline = (value: unknown): DevTimelineEntry[] =>
  readObjects(value).map((item) => ({
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
  education: readTimeline(data.education),
  timeline: readDevTimeline(data.timeline),
  awards: normalizeDevAwards(data.awards),
});

export { decodeDevConfig, decodeDevProject };
