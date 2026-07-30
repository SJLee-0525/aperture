import { Suspense } from "react";

import { DevProjectsView } from "@/features/dev/_components/DevProjectsView";
import { getDevProjects } from "@/lib/content/get-dev-projects";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "개발 프로젝트",
  description: "이성준이 설계하고 개발한 웹·소프트웨어 프로젝트를 소개합니다.",
  pathname: "/dev/projects",
});

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
