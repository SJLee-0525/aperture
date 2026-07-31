import { getDevProjects } from "@/lib/content/get-dev-projects";
import { shouldUseMockContent } from "@/lib/content/content-source";
import type { DevProject } from "@/types/dev";

/** 공개된 단일 개발 프로젝트. mock에서는 수상 딥링크용 상세 전용 fixture도 조회한다. */
const getDevProject = async (id: string): Promise<DevProject | null> => {
  const projects = await getDevProjects();
  const listedProject = projects.find((project) => project.id === id);
  if (listedProject || !shouldUseMockContent()) return listedProject ?? null;

  const { MOCK_DEV_PROJECT_DETAILS } = await import("@/mocks/dev");
  return MOCK_DEV_PROJECT_DETAILS.find((project) => project.published && project.id === id) ?? null;
};

export { getDevProject };
