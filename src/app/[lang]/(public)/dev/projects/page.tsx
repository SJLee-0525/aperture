import { Suspense } from "react";

import { CardGridPageSkeleton } from "@/components/skeletons/CardGridPageSkeleton";
import { DevProjectsView } from "@/features/dev/_components/DevProjectsView";

import { toDevProjectCards } from "@/features/dev/_lib/dev-project-card";
import { groupArticlesByProject } from "@/features/dev/_lib/group-articles-by-project";

import { getDevProjects } from "@/lib/content/dev";
import { getDevArticleProjectLinks } from "@/lib/content/dev-articles";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "개발 프로젝트", en: "Development Projects" },
    description: {
      ko: "개발자 이성준이 설계하고 개발한 웹·소프트웨어 프로젝트를 소개합니다.",
      en: "Web and software projects designed and built by developer Sungjoon Lee.",
    },
    pathname: "/dev/projects",
  });
}

/**
 * 개발 — 프로젝트 (/dev/projects): 카드 그리드 + 상세 모달(?project= 딥링크, useSearchParams) → Suspense.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function DevProjectsPage() {
  const [projects, articleLinks] = await Promise.all([
    getDevProjects(),
    getDevArticleProjectLinks(),
  ]);
  return (
    <Suspense fallback={<CardGridPageSkeleton kind="project" />}>
      <DevProjectsView
        projects={toDevProjectCards(projects)}
        articlesByProject={groupArticlesByProject(articleLinks)}
      />
    </Suspense>
  );
}
