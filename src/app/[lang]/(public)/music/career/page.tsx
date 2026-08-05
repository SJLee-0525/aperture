import type { Metadata } from "next";
import { Suspense } from "react";

import { MusicCareerView } from "@/features/music/_components/MusicCareerView";
import { getMusicAwards, getMusicConfig } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "음악 경력", en: "Music Career" },
    description: {
      ko: "피아니스트 이성준의 학력, 경력과 수상 이력을 소개합니다.",
      en: "The education, career, and awards of pianist Sungjoon Lee.",
    },
    pathname: "/music/career",
  });
}

export const revalidate = 3600;

/** 음악 — 경력 (/music/career): 학력·경력 타임라인 + 수상. 수상 모달 ?award= 딥링크(useSearchParams) → Suspense. */
export default async function MusicCareerPage() {
  const [config, awards] = await Promise.all([getMusicConfig(), getMusicAwards()]);
  return (
    <Suspense>
      <MusicCareerView config={config} awards={awards} />
    </Suspense>
  );
}
