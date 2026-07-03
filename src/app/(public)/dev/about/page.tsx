import { DevAboutView } from "@/features/dev/_components/DevAboutView";
import { getDevConfig } from "@/lib/content/get-dev-config";
import { getDevProjects } from "@/lib/content/get-dev-projects";

export const revalidate = 3600;

/** 개발 — 소개 (/dev/about): 공통 소개 레이아웃(프로젝트·스택 파생 통계) + 인터뷰 Q&A. */
export default async function DevAboutPage() {
  const [config, projects] = await Promise.all([getDevConfig(), getDevProjects()]);
  return <DevAboutView config={config} projects={projects} />;
}
