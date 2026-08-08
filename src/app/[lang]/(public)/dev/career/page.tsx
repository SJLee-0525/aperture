import type { Metadata } from "next";
import { Suspense } from "react";

import { TimelinePageSkeleton } from "@/components/PublicPageSkeletons";
import { DevCareerView } from "@/features/dev/_components/DevCareerView";
import { getDevConfig } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "개발 경력", en: "Development Career" },
    description: {
      ko: "개발자 이성준의 학력, 경력과 수상 이력을 소개합니다.",
      en: "The education, career, and awards of developer Sungjoon Lee.",
    },
    pathname: "/dev/career",
  });
}

export const revalidate = 3600;

/**
 * 개발 — 경력 (/dev/career): 학력·경력 타임라인 + 수상.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function DevCareerPage() {
  const config = await getDevConfig();
  return (
    <Suspense fallback={<TimelinePageSkeleton />}>
      <DevCareerView config={config} />
    </Suspense>
  );
}
