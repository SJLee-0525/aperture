import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AlbumDetailView } from "@/features/albums/_components/AlbumDetailView";
import { resolveAlbumCover } from "@/features/albums/_lib/resolve-album-cover";
import { getAlbum } from "@/lib/content/get-album";
import { getAlbums } from "@/lib/content/get-albums";
import { getPhotos } from "@/lib/content/get-photos";
import { getTags } from "@/lib/content/get-tags";
import type { Photo } from "@/types/photo";

export const revalidate = 3600;

/** 공개 앨범 id들을 미리 프리렌더 */
export async function generateStaticParams() {
  const albums = await getAlbums();
  return albums.map((album) => ({ id: album.id }));
}

type Props = { params: Promise<{ id: string }> };

export default async function AlbumDetailPage({ params }: Props) {
  const { id } = await params;
  const [album, photos, tags] = await Promise.all([getAlbum(id), getPhotos(), getTags()]);
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
