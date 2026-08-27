import { Suspense } from "react";

import { TimelinePageSkeleton } from "@/components/skeletons/TimelinePageSkeleton";
import { DevCareerView } from "@/features/dev/_components/DevCareerView";

import { getDevConfig } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "개발 경력", en: "Development Career" },
    description: {
      ko: "개발자 이성준의 학력, 경력, 수상 이력과 사용 기술을 소개합니다.",
      en: "The education, career, awards, and tech stack of developer Sungjoon Lee.",
    },
    pathname: "/dev/career",
  });
}

/**
 * 개발 — 경력 (/dev/career): 학력·경력 타임라인 + 수상 + 기술 스택.
 * 수상 모달이 `?award=` 를 읽으므로 Suspense 경계가 필요하다.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function DevCareerPage() {
  const config = await getDevConfig();
  return (
    <Suspense fallback={<TimelinePageSkeleton withStack />}>
      <DevCareerView config={config} />
    </Suspense>
  );
}
