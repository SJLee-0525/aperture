import { COLLECTIONS, SITE_DEV_DOC } from "@/constants/collections";

import { normalizeDevAwards } from "@/lib/firebase/normalize-dev-awards";
import { normalizeTroubleshooting } from "@/lib/firebase/normalize-troubleshooting";
import {
  fetchDocument,
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  runQuery,
} from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";

import type { DevConfig, DevProject } from "@/types/dev";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

type ChatDevProject = Pick<
  DevProject,
  "id" | "title" | "summary" | "position" | "techTags" | "cover" | "order" | "published"
>;

/**
 * REST API로 읽은 프로젝트 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id Firestore 프로젝트 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 프로젝트 문서 필드.
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
  links: (data.links as SiteLink[]) ?? [],
  cover: (data.cover as ImageMeta | null) ?? null,
  images: (data.images as ImageMeta[]) ?? [],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * REST API로 읽은 개발 설정 필드를 공개 페이지 모델로 변환한다.
 *
 * @param {Record<string, unknown>} data 디코딩된 개발 설정 필드.
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
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<DevProject[]>} 공개된 개발 프로젝트 목록.
 */
const fetchPublishedDevProjects = async (options?: { fresh?: boolean }): Promise<DevProject[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.DEV_PROJECTS), options)).map(({ id, data }) =>
    toDevProject(id, data),
  );

/**
 * 공개 페이지에서 사용할 개발 설정 문서를 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<DevConfig | null>} 개발 설정. 문서가 없으면 `null`이다.
 */
const fetchDevConfig = async (options?: { fresh?: boolean }): Promise<DevConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_DEV_DOC, "dev config", options);
  return data ? toDevConfig(data) : null;
};

/**
 * 채팅 검색에 필요한 공개 프로젝트 필드만 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<ChatDevProject[]>} 채팅용 프로젝트 목록.
 */
const fetchChatDevProjects = async (options?: { fresh?: boolean }): Promise<ChatDevProject[]> =>
  (
    await runQuery(
      projectedPublishedOrderedQuery(COLLECTIONS.DEV_PROJECTS, [
        "title",
        "summary",
        "position",
        "techTags",
        "cover",
        "order",
        "published",
      ]),
      options,
    )
  ).map(({ id, data }) => {
    const project = toDevProject(id, data);
    return {
      id: project.id,
      title: project.title,
      summary: project.summary,
      position: project.position,
      techTags: project.techTags,
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
