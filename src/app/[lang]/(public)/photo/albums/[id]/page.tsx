import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { AlbumDetailView } from "@/features/albums/_components/AlbumDetailView";

import {
  resolveAlbumCover,
  resolveAlbumCoverPreview,
} from "@/features/albums/_lib/resolve-album-cover";

import { getAlbum, getAlbums, getPhotos, getTags } from "@/lib/content/photo";
import { pickText } from "@/lib/i18n/pick-text";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Photo } from "@/types/photo";
import type { Metadata } from "next";

import AlbumDetailLoading from "./loading";

/**
 * 공개 앨범 id들을 미리 프리렌더 — lang은 상위 [lang] layout의 generateStaticParams가 공급
 *
 * @returns {Promise<{ id: string }[]>}
 */
export async function generateStaticParams() {
  const albums = await getAlbums();
  return albums.map((album) => ({ id: album.id }));
}

/** 프리렌더 목록 밖 id 는 404 가 아니라 요청-시 렌더한다 — 빌드 후 발행한 앨범이 이 경로로 열린다. */
export const dynamicParams = true;

type Props = { params: Promise<{ lang: Lang; id: string }> };

const getAlbumPageData = cache(async (id: string) => {
  const [album, photos] = await Promise.all([getAlbum(id), getPhotos()]);
  return { album, photos };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const { album, photos } = await getAlbumPageData(id);

  if (!album) {
    return {
      title: "Album Not Found",
      robots: { index: false, follow: false },
    };
  }

  const title = pickText(album.title, lang);
  const koSubtitle = pickText(album.subtitle, "ko");
  const enSubtitle = pickText(album.subtitle, "en");
  const koTitle = pickText(album.title, "ko");
  const enTitle = pickText(album.title, "en");
  const description = {
    ko: koSubtitle
      ? `${koTitle} — ${koSubtitle}. 사진작가 이성준의 사진 앨범.`
      : `${koTitle} — 사진작가 이성준의 사진 앨범.`,
    en: enSubtitle
      ? `${enTitle} — ${enSubtitle}. A photo album by photographer Sungjoon Lee.`
      : `${enTitle} — a photo album by photographer Sungjoon Lee.`,
  };
  const coverUrl = resolveAlbumCover(album, photos);
  const pathname = `/photo/albums/${id}`;
  const base = pageMetadata({ lang, title: album.title, description, pathname });

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
    <Suspense fallback={<AlbumDetailLoading />}>
      <AlbumDetailView album={album} photos={albumPhotos} coverUrl={coverUrl} tags={tags} />
    </Suspense>
  );
}
