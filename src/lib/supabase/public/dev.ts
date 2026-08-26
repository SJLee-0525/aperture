import { COLLECTIONS, SITE_DEV_DOC } from "@/constants/collections";
import { decodeDevConfig, decodeDevProject } from "@/lib/supabase/decode/dev";
import { sanitizeDevProjectForPublic } from "@/lib/supabase/decode/public-sanitize";
import { fetchRow, selectPublished } from "@/lib/supabase/public/transport";

import type { DevConfig, DevProject } from "@/types/dev";

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

/** 공개 프로젝트 모델. 저장된 링크는 여기서만 표시용으로 정화한다. */
const toDevProject = (id: string, data: Record<string, unknown>): DevProject =>
  sanitizeDevProjectForPublic(decodeDevProject(id, data));

const toDevConfig = decodeDevConfig;

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
