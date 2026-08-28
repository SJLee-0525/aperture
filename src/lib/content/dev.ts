import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import { publishedInOrder } from "@/lib/content/mock-list";
import { fetchDevConfig, fetchPublishedDevProjects } from "@/lib/supabase/public/dev";

import type { DevConfig, DevProject } from "@/types/dev";

const getDevProjects = async (): Promise<DevProject[]> => {
  if (!shouldUseMockContent()) return fetchPublishedDevProjects();
  const { MOCK_DEV_PROJECTS } = await import("@/mocks/dev");
  return publishedInOrder(MOCK_DEV_PROJECTS);
};

const getDevProject = async (id: string): Promise<DevProject | null> => {
  const listed = (await getDevProjects()).find((project) => project.id === id);
  if (listed || !shouldUseMockContent()) return listed ?? null;
  // mock 전용 폴백이지만 live 와 계약이 갈리지 않는다. live 에는 공개 목록 밖의 published
  // 프로젝트가 존재할 수 없고, 이 fixture 는 수상 모달 딥링크를 mock 에서도 열기 위해 있다.
  const { MOCK_DEV_PROJECT_DETAILS } = await import("@/mocks/dev");
  return MOCK_DEV_PROJECT_DETAILS.find((project) => project.published && project.id === id) ?? null;
};

const getDevConfig = async (): Promise<DevConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/dev")).MOCK_DEV_CONFIG;
  return (await fetchDevConfig()) ?? EMPTY_DEV_CONFIG;
};

export { getDevConfig, getDevProject, getDevProjects };
