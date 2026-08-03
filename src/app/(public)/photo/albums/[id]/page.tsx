import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { AlbumDetailView } from "@/features/albums/_components/AlbumDetailView";
import {
  resolveAlbumCover,
  resolveAlbumCoverPreview,
} from "@/features/albums/_lib/resolve-album-cover";

import { DEFAULT_LANG } from "@/constants/langs";

import { getAlbum, getAlbums, getPhotos, getTags } from "@/lib/content/photo";
import { pickText } from "@/lib/i18n/pick-text";
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
      title: "Album Not Found",
      robots: { index: false, follow: false },
    };
  }

  // 탭 제목은 영어 고정 정책(lib/seo/metadata.ts 참조) — en 비면 ko 폴백. 설명은 ko 기준.
  const title = pickText(album.title, "en");
  const koTitle = pickText(album.title, DEFAULT_LANG);
  const koSubtitle = pickText(album.subtitle, DEFAULT_LANG);
  const description = koSubtitle
    ? `${koTitle} — ${koSubtitle}. 사진작가 이성준의 사진 앨범.`
    : `${koTitle} — 사진작가 이성준의 사진 앨범.`;
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
  const coverUrl = resolveAlbumCoverPreview(album, albumPhotos);

  return (
    <Suspense>
      <AlbumDetailView album={album} photos={albumPhotos} coverUrl={coverUrl} tags={tags} />
    </Suspense>
  );
}
