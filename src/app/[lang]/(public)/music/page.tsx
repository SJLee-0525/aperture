import { Suspense } from "react";

import { CardGridPageSkeleton } from "@/components/PublicPageSkeletons";
import { MusicWorksView } from "@/features/music/_components/MusicWorksView";

import { getMusicWorks } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

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

const MusicWorksContent = async () => {
  const works = await getMusicWorks();
  return <MusicWorksView works={works} />;
};

/**
 * 음악 — 연주 목록 (/music). MusicWorksView 가 ?work= 딥링크(useSearchParams)를 읽어 Suspense.
 *
 * 셸을 동기로 두고 fetch 를 자식으로 내린다. 상위 `music/loading.tsx` 경계는 about·career·
 * media 전환에도 함께 쓰여 이 지면 모양을 그릴 수 없다.
 *
 * @returns {JSX.Element}
 */
export default function MusicPage() {
  return (
    <Suspense fallback={<CardGridPageSkeleton kind="poster" />}>
      <MusicWorksContent />
    </Suspense>
  );
}
