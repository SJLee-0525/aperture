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
    pathname: "/dev",
  });
}

/** 개발 — 소개 (/dev): 공통 소개 레이아웃(프로젝트·스택 파생 통계) + 인터뷰 Q&A.
 *  개발 섹션의 첫 화면이라 mega-menu 의 「개발」 버튼과 모바일 탭의 소개가 이 경로로 온다.
 *
 * @returns {Promise<JSX.Element>}
 *  뷰가 소비하는 config 필드와 프로젝트별 techTags만 투영해 직렬화. */
export default async function DevPage() {
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
