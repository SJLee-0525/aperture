import { Suspense } from "react";

import { AlbumsSkeleton } from "@/features/albums/_components/AlbumsSkeleton";
import { AlbumsView } from "@/features/albums/_components/AlbumsView";

import { toAlbumCards } from "@/features/albums/_lib/album-cards";

import { getAlbums, getPhotos } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

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

/** 커버 해석·장수 집계는 서버 투영으로 끝내고 카드 데이터만 직렬화. */
const AlbumsContent = async () => {
  const [albums, photos] = await Promise.all([getAlbums(), getPhotos()]);
  return <AlbumsView albums={toAlbumCards(albums, photos)} />;
};

/**
 * 앨범 목록 (/photo/albums).
 *
 * 셸을 동기로 두고 fetch 를 자식으로 내린다. 상위 `albums/loading.tsx` 경계는 `[id]` 상세
 * 전환에도 함께 쓰여 목록 모양을 그릴 수 없다.
 *
 * @returns {JSX.Element}
 */
export default function AlbumsPage() {
  return (
    <Suspense fallback={<AlbumsSkeleton />}>
      <AlbumsContent />
    </Suspense>
  );
}
