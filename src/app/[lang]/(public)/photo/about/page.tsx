import { AboutView } from "@/features/photo-about/_components/AboutView";

import { toLang } from "@/constants/langs";
import { getAlbums, getPhotos } from "@/lib/content/photo";
import { getSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "사진가 소개", en: "About the Photographer" },
    description: {
      ko: "이성준의 사진 작업 기록을 소개합니다.",
      en: "About photographer Sungjoon Lee and a record of his photographic work.",
    },
    pathname: "/photo/about",
  });
}

/**
 * 소개 — 통계는 사진·앨범에서 자동 집계. 파생에 쓰는 필드만 투영해 직렬화.
 */
export default async function AboutPage({ params }: Props) {
  const [{ lang }, site, photos, albums] = await Promise.all([
    params,
    getSite(),
    getPhotos(),
    getAlbums(),
  ]);
  const photoFacts = photos.map(({ camera, lens, place }) => ({ camera, lens, place }));
  return (
    <AboutView
      lang={toLang(lang)}
      bio={site.bio}
      photoFacts={photoFacts}
      albumCount={albums.length}
    />
  );
}
