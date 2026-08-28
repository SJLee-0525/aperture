import { Suspense } from "react";

import { AboutPageSkeleton } from "@/components/skeletons/AboutPageSkeleton";
import { DevAboutView } from "@/features/dev/_components/DevAboutView";

import { toLang } from "@/constants/langs";
import { getDevConfig, getDevProjects } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

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

/** 뷰가 소비하는 config 필드와 프로젝트별 techTags만 투영해 직렬화.
 *  params 를 await 하지 않고 그대로 받아 셸이 동기로 남게 한다. */
const DevAboutContent = async ({ params }: Props) => {
  const [{ lang }, config, projects] = await Promise.all([
    params,
    getDevConfig(),
    getDevProjects(),
  ]);
  return (
    <DevAboutView
      lang={toLang(lang)}
      heroLead={config.heroLead}
      stack={config.stack}
      interview={config.interview}
      timelineCount={config.timeline.length}
      projectTechTags={projects.map((p) => p.techTags)}
    />
  );
};

/** 개발 — 소개 (/dev): 공통 소개 레이아웃(프로젝트·스택 파생 통계) + 인터뷰 Q&A.
 *  개발 섹션의 첫 화면이라 mega-menu 의 「개발」 버튼과 모바일 탭의 소개가 이 경로로 온다.
 *
 *  셸을 동기로 두고 fetch 를 자식으로 내린다. 상위 `dev/loading.tsx` 경계는 career·projects·
 *  articles 전환에도 함께 쓰여 이 지면 모양을 그릴 수 없다.
 */
export default function DevPage({ params }: Props) {
  return (
    <Suspense fallback={<AboutPageSkeleton extended />}>
      <DevAboutContent params={params} />
    </Suspense>
  );
}
