import { DevProjectsView } from "@/features/dev/DevProjectsView";
import { getDevProjects } from "@/lib/content/get-dev-projects";

export const revalidate = 3600;

/** 개발 — 프로젝트 (/dev/projects): 카드 그리드 + 상세 모달. */
export default async function DevProjectsPage() {
  const projects = await getDevProjects();
  return <DevProjectsView projects={projects} />;
}
