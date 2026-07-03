import { Suspense } from "react";

import { DevProjectsView } from "@/features/dev/DevProjectsView";
import { getDevProjects } from "@/lib/content/get-dev-projects";

export const revalidate = 3600;

/** 개발 — 프로젝트 (/dev/projects): 카드 그리드 + 상세 모달(?project= 딥링크, useSearchParams) → Suspense. */
export default async function DevProjectsPage() {
  const projects = await getDevProjects();
  return (
    <Suspense>
      <DevProjectsView projects={projects} />
    </Suspense>
  );
}
