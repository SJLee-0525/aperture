"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";

/**
 * 관리자 프로젝트 목록 상태 — 저장소는 mock/live 가 갈리는 repository 경계에서 받는다.
 *
 * @returns {{ projects: AdminDevProjectListItem[] } & ReturnType<typeof useOrderedAdmin>} 목록과 공용 상태 머신.
 */
const useDevProjectsAdmin = () => {
  const { items: projects, ...admin } = useOrderedAdmin(getDevProjectRepository());
  return { projects, ...admin };
};

export { useDevProjectsAdmin };
