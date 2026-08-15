import { COLLECTIONS, SITE_DEV_DOC } from "@/constants/collections";
import { normalizeDevAwards } from "@/lib/content/normalize-dev-awards";
import { normalizeTroubleshooting } from "@/lib/content/normalize-troubleshooting";
import { asText } from "@/lib/i18n/as-text";
import { sanitizePublicLinks } from "@/lib/security/public-url";
import { fetchRow, selectPublished } from "@/lib/supabase/public/transport";

import type { DevConfig, DevProject } from "@/types/dev";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

type ChatDevProject = Pick<
  DevProject,
  | "id"
  | "title"
  | "summary"
  | "position"
  | "techTags"
  | "achievements"
  | "cover"
  | "order"
  | "published"
>;

/**
 * PostgREST 행에서 병합된 프로젝트 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id 문서 ID.
 * @param {Record<string, unknown>} data 병합된 프로젝트 문서 필드.
 * @returns {DevProject} 다국어 필드와 중첩 목록이 정규화된 프로젝트 모델.
 */
const toDevProject = (id: string, data: Record<string, unknown>): DevProject => ({
  id,
  title: asText(data.title),
  category: asText(data.category),
  year: (data.year as string) ?? "",
  period: asText(data.period),
  position: asText(data.position),
  summary: asText(data.summary),
  overview: asText(data.overview),
  features: (data.features as LocalizedText[]) ?? [],
  roles: (data.roles as LocalizedText[]) ?? [],
  troubleshooting: normalizeTroubleshooting(data.troubleshooting),
  achievements: (data.achievements as LocalizedText[]) ?? [],
  techTags: (data.techTags as string[]) ?? [],
  links: sanitizePublicLinks(data.links),
  cover: (data.cover as ImageMeta | null) ?? null,
  images: (data.images as ImageMeta[]) ?? [],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * PostgREST 행에서 병합된 개발 설정 필드를 공개 페이지 모델로 변환한다.
 *
 * @param {Record<string, unknown>} data 병합된 개발 설정 필드.
 * @returns {DevConfig} 소개, 기술 스택과 이력이 정규화된 설정.
 */
const toDevConfig = (data: Record<string, unknown>): DevConfig => ({
  heroLead: asText(data.heroLead),
  interview: (data.interview as DevConfig["interview"]) ?? [],
  stack: (data.stack as DevConfig["stack"]) ?? [],
  education: (data.education as DevConfig["education"]) ?? [],
  timeline: (data.timeline as DevConfig["timeline"]) ?? [],
  awards: normalizeDevAwards(data.awards),
});

/**
 * 공개된 개발 프로젝트 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<DevProject[]>} 공개된 개발 프로젝트 목록.
 */
const fetchPublishedDevProjects = async (options?: { fresh?: boolean }): Promise<DevProject[]> =>
  (await selectPublished(COLLECTIONS.DEV_PROJECTS, options)).map(({ id, data }) =>
    toDevProject(id, data),
  );

/**
 * 공개 페이지에서 사용할 개발 설정 문서를 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<DevConfig | null>} 개발 설정. 문서가 없으면 `null`이다.
 */
const fetchDevConfig = async (options?: { fresh?: boolean }): Promise<DevConfig | null> => {
  const data = await fetchRow(COLLECTIONS.SITE, SITE_DEV_DOC, "dev config", options);
  return data ? toDevConfig(data) : null;
};

/**
 * 채팅 검색용 공개 프로젝트 목록. 행 전체를 받아 도메인 투영만 유지한다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatDevProject[]>} 채팅용 프로젝트 목록.
 */
const fetchChatDevProjects = async (options?: { fresh?: boolean }): Promise<ChatDevProject[]> =>
  (await selectPublished(COLLECTIONS.DEV_PROJECTS, options)).map(({ id, data }) => {
    const project = toDevProject(id, data);
    return {
      id: project.id,
      title: project.title,
      summary: project.summary,
      position: project.position,
      techTags: project.techTags,
      achievements: project.achievements,
      cover: project.cover,
      order: project.order,
      published: project.published,
    };
  });

export {
  fetchChatDevProjects,
  fetchDevConfig,
  fetchPublishedDevProjects,
  toDevConfig,
  toDevProject,
};
export type { ChatDevProject };
