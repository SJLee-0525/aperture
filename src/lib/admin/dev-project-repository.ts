import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";
import { deleteMockImageFolder } from "@/lib/admin/mock/mock-image-store";
import { selectRepository } from "@/lib/admin/select-repository";
import { listDevProjectItemsAdmin } from "@/lib/supabase/admin-list";
import { devProjects } from "@/lib/supabase/dev";

import type { AdminListRepository } from "@/lib/admin/admin-list-repository";
import type { AdminDevProjectListItem } from "@/types/admin";
import type { DevProject } from "@/types/dev";

type DevProjectRepository = AdminListRepository<DevProject, AdminDevProjectListItem>;

/** 저장 형식 버전 — `DevProject` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 목록 행 투영 — live REST projection(`listDevProjectItemsAdmin`)과 같은 필드.
 * 트러블슈팅·갤러리 이미지 같은 큰 필드를 빼서 목록이 받는 양을 live 와 맞춘다.
 *
 * @param {DevProject} project 저장된 프로젝트 전체.
 * @returns {AdminDevProjectListItem} 목록 행에 필요한 필드만.
 */
const toListItem = ({
  id,
  title,
  year,
  cover,
  order,
  published,
}: DevProject): AdminDevProjectListItem => ({ id, title, year, cover, order, published });

/**
 * mock 구현 — 삭제 시 live `devProjects.remove` 의 Storage 정리에 해당하는
 * `dev/{id}` objectURL 회수를 더한다.
 *
 * @returns {DevProjectRepository} 브라우저 로컬 저장소에 붙은 프로젝트 CRUD.
 */
const createMockDevProjectRepository = (): DevProjectRepository => {
  const base = createLocalListRepository<DevProject, AdminDevProjectListItem>({
    key: STORAGE_KEYS.ADMIN_DEV_PROJECTS,
    version: STORE_VERSION,
    label: "프로젝트",
    seed: async () => [...(await import("@/mocks/dev")).MOCK_DEV_PROJECTS],
    toListItem,
    getStorage: () => window.localStorage,
  });
  return {
    ...base,
    remove: async (id) => {
      await base.remove(id);
      deleteMockImageFolder(`dev/${id}`);
    },
  };
};

/**
 * 현재 콘텐츠 소스에 맞는 프로젝트 저장소. live 는 기존 `listCrud` 산출물에 REST 목록만 얹은,
 * 지금까지 훅이 조립하던 어댑터 그대로다.
 *
 * @returns {DevProjectRepository} mock 이면 브라우저 로컬, live 면 Firestore 구현.
 */
const getDevProjectRepository = selectRepository<DevProjectRepository>(
  createMockDevProjectRepository,
  () => ({ ...devProjects, list: listDevProjectItemsAdmin }),
);

export { getDevProjectRepository };
