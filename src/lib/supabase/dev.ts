import { documentCacheTag } from "@/constants/cache";
import { COLLECTIONS, SITE_DEV_DOC, tableFor } from "@/constants/collections";
import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { toJson } from "@/lib/supabase/admin/row-codec";
import { getSupabaseClient } from "@/lib/supabase/client";
import { decodeDevConfig, decodeDevProject } from "@/lib/supabase/decode/dev";
import { sortableListCrud } from "@/lib/supabase/list-crud";
import { deleteDevProjectImages } from "@/lib/supabase/storage";

import type { DevConfig, DevProject } from "@/types/dev";

const SITE_TABLE = tableFor(COLLECTIONS.SITE);

/**
 * 프로젝트 행의 다국어 필드와 배열 기본값을 정규화한다.
 *
 * @param id 프로젝트 문서 ID.
 * @param d 병합된 프로젝트 문서 필드.
 * @returns 관리자 화면에서 사용하는 프로젝트 모델.
 */

const devProjectsCrud = sortableListCrud<DevProject>(
  COLLECTIONS.DEV_PROJECTS,
  decodeDevProject,
  "프로젝트",
  "project",
);
const devProjects = {
  ...devProjectsCrud,
  /**
   * 프로젝트 문서를 삭제한 뒤 해당 프로젝트의 Storage 이미지도 정리한다.
   *
   * @param id 삭제할 프로젝트 문서 ID.
   * @returns 문서 삭제와 이미지 정리가 끝나면 완료된다.
   */
  remove: async (id: string): Promise<void> => {
    await devProjectsCrud.remove(id);
    await deleteDevProjectImages(id).catch(() => undefined);
  },
};

/**
 * 소개 문구, 인터뷰, 기술 스택과 이력을 담은 개발 설정 문서를 읽는다.
 *
 * @returns 저장된 설정. 문서가 없으면 빈 설정을 반환한다.
 */
const getDevConfigAdmin = async (): Promise<DevConfig> => {
  const { data, error } = await getSupabaseClient()
    .from(SITE_TABLE)
    .select("data")
    .eq("id", SITE_DEV_DOC)
    .maybeSingle();
  if (error) throw new Error("개발 설정을 불러오지 못했습니다.");
  if (!data) return EMPTY_DEV_CONFIG;
  return decodeDevConfig((data.data as Record<string, unknown> | null) ?? {});
};

/**
 * 개발 설정 문서 전체를 저장하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param config 저장할 개발 소개와 이력 설정.
 * @returns 저장과 RAG 동기화가 끝나면 완료된다.
 */
const updateDevConfig = async (config: DevConfig): Promise<void> => {
  const { data, error } = await getSupabaseClient()
    .from(SITE_TABLE)
    .upsert({ id: SITE_DEV_DOC, data: toJson(config as unknown as Record<string, unknown>) })
    .select("id");
  if (error || !data?.length) throw new Error("개발 설정 저장에 실패했습니다.");
  requestPublicRevalidate(documentCacheTag(COLLECTIONS.SITE, SITE_DEV_DOC));
  await requestRagSync("devConfig", SITE_DEV_DOC);
};

/** 새 프로젝트를 저장할 때 사용하는 문서 ID 제외 입력값. */
type DevProjectInput = Omit<DevProject, "id">;

export { devProjects, getDevConfigAdmin, updateDevConfig };
export type { DevProjectInput };
