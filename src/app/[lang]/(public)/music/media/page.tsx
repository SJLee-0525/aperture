import type { Metadata } from "next";

import { MusicMediaView } from "@/features/music/_components/MusicMediaView";
import { getMusicMedia } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "연주 영상", en: "Performance Videos" },
    description: {
      ko: "피아니스트 이성준의 공연과 연주 영상을 소개합니다.",
      en: "Concert and performance videos of pianist Sungjoon Lee.",
    },
    pathname: "/music/media",
  });
}

export const revalidate = 3600;

/**
 * 음악 — 영상 (/music/media).
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function MusicMediaPage() {
  const media = await getMusicMedia();
  return <MusicMediaView media={media} />;
}
