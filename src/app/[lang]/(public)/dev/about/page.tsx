import type { Metadata } from "next";

import { DevAboutView } from "@/features/dev/_components/DevAboutView";
import { getDevConfig, getDevProjects } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "개발자 소개", en: "About the Developer" },
    description: {
      ko: "개발자 이성준의 작업 방식, 경험과 관심사를 소개합니다.",
      en: "How developer Sungjoon Lee works — his experience and interests.",
    },
    pathname: "/dev/about",
  });
}

export const revalidate = 3600;

/** 개발 — 소개 (/dev/about): 공통 소개 레이아웃(프로젝트·스택 파생 통계) + 인터뷰 Q&A.
 *  뷰가 소비하는 config 필드와 프로젝트별 techTags만 투영해 직렬화. */
export default async function DevAboutPage() {
  const [config, projects] = await Promise.all([getDevConfig(), getDevProjects()]);
  return (
    <DevAboutView
      heroLead={config.heroLead}
      stack={config.stack}
      interview={config.interview}
      timelineCount={config.timeline.length}
      projectTechTags={projects.map((p) => p.techTags)}
    />
  );
}
