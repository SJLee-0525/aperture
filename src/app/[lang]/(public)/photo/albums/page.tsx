import type { Metadata } from "next";

import { AlbumsView } from "@/features/albums/_components/AlbumsView";
import { toAlbumCards } from "@/features/albums/_lib/album-cards";
import { getAlbums, getPhotos } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "사진 앨범", en: "Photo Albums" },
    description: {
      ko: "사진작가 이성준의 사진 작업을 주제와 장소별 앨범으로 소개합니다.",
      en: "Photo albums by Sungjoon Lee, grouped by theme and place.",
    },
    pathname: "/photo/albums",
  });
}

export const revalidate = 3600;

/**
 * 앨범 목록 — 커버 해석·장수 집계는 서버 투영으로 끝내고 카드 데이터만 직렬화.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function AlbumsPage() {
  const [albums, photos] = await Promise.all([getAlbums(), getPhotos()]);
  return <AlbumsView albums={toAlbumCards(albums, photos)} />;
}
