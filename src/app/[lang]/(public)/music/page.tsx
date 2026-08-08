import type { Metadata } from "next";
import { Suspense } from "react";

import { CardGridPageSkeleton } from "@/components/PublicPageSkeletons";
import { MusicWorksView } from "@/features/music/_components/MusicWorksView";
import { getMusicWorks } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "연주", en: "Performances" },
    description: {
      ko: "피아니스트 이성준의 공연과 연주 프로그램을 소개합니다.",
      en: "Concerts and performance programs by pianist Sungjoon Lee.",
    },
    pathname: "/music",
  });
}

export const revalidate = 3600;

/**
 * 음악 — 연주 목록 (/music). MusicWorksView 가 ?work= 딥링크(useSearchParams)를 읽어 Suspense.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function MusicPage() {
  const works = await getMusicWorks();
  return (
    <Suspense fallback={<CardGridPageSkeleton kind="poster" />}>
      <MusicWorksView works={works} />
    </Suspense>
  );
}
