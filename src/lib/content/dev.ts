import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchDevConfig, fetchPublishedDevProjects } from "@/lib/firebase/public/dev";

import type { DevConfig, DevProject } from "@/types/dev";

const getDevProjects = async (): Promise<DevProject[]> => {
  if (!shouldUseMockContent()) return fetchPublishedDevProjects();
  const { MOCK_DEV_PROJECTS } = await import("@/mocks/dev");
  return MOCK_DEV_PROJECTS.filter((item) => item.published).sort((a, b) => a.order - b.order);
};

const getDevProject = async (id: string): Promise<DevProject | null> => {
  const listed = (await getDevProjects()).find((project) => project.id === id);
  if (listed || !shouldUseMockContent()) return listed ?? null;
  const { MOCK_DEV_PROJECT_DETAILS } = await import("@/mocks/dev");
  return MOCK_DEV_PROJECT_DETAILS.find((project) => project.published && project.id === id) ?? null;
};

const getDevConfig = async (): Promise<DevConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/dev")).MOCK_DEV_CONFIG;
  return (await fetchDevConfig()) ?? EMPTY_DEV_CONFIG;
};

export { getDevConfig, getDevProject, getDevProjects };
