import { getDevProjects } from "@/lib/content/get-dev-projects";
import type { DevProject } from "@/types/dev";

/** 공개된 단일 개발 프로젝트. 목록 데이터 소스와 published 정책을 그대로 공유한다. */
const getDevProject = async (id: string): Promise<DevProject | null> => {
  const projects = await getDevProjects();
  return projects.find((project) => project.id === id) ?? null;
};

export { getDevProject };
