import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { AlbumDetailView } from "@/features/albums/_components/AlbumDetailView";
import { resolveAlbumCover } from "@/features/albums/_lib/resolve-album-cover";
import { getAlbum } from "@/lib/content/get-album";
import { getAlbums } from "@/lib/content/get-albums";
import { getPhotos } from "@/lib/content/get-photos";
import { getTags } from "@/lib/content/get-tags";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Photo } from "@/types/photo";

export const revalidate = 3600;

/** 공개 앨범 id들을 미리 프리렌더 */
export async function generateStaticParams() {
  const albums = await getAlbums();
  return albums.map((album) => ({ id: album.id }));
}

type Props = { params: Promise<{ id: string }> };

const getAlbumPageData = cache(async (id: string) => {
  const [album, photos] = await Promise.all([getAlbum(id), getPhotos()]);
  return { album, photos };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { album, photos } = await getAlbumPageData(id);

  if (!album) {
    return {
      title: "앨범을 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const title = album.title.ko || album.title.en;
  const subtitle = album.subtitle.ko || album.subtitle.en;
  const description = subtitle
    ? `${title} — ${subtitle}. 사진작가 이성준의 사진 앨범.`
    : `${title} — 사진작가 이성준의 사진 앨범.`;
  const coverUrl = resolveAlbumCover(album, photos);
  const pathname = `/photo/albums/${id}`;
  const base = pageMetadata({ title, description, pathname });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: coverUrl ? [{ url: coverUrl, alt: title }] : undefined,
    },
    twitter: {
      ...base.twitter,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function AlbumDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ album, photos }, tags] = await Promise.all([getAlbumPageData(id), getTags()]);
  if (!album) notFound();

  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const albumPhotos = album.photoIds
    .map((photoId) => byId.get(photoId))
    .filter((photo): photo is Photo => photo != null);
  const coverUrl = resolveAlbumCover(album, albumPhotos);

  return (
    <Suspense>
      <AlbumDetailView album={album} photos={albumPhotos} coverUrl={coverUrl} tags={tags} />
    </Suspense>
  );
}
