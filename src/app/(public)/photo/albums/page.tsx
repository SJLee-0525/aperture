import { AlbumsView } from "@/features/albums/AlbumsView";
import { getAlbums } from "@/lib/content/get-albums";
import { getPhotos } from "@/lib/content/get-photos";

export const revalidate = 3600;

/** 앨범 목록 — 커버 해석을 위해 사진도 함께 로드. */
export default async function AlbumsPage() {
  const [albums, photos] = await Promise.all([getAlbums(), getPhotos()]);
  return <AlbumsView albums={albums} photos={photos} />;
}
