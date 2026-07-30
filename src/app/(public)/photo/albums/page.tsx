import { AlbumsView } from "@/features/albums/_components/AlbumsView";
import { getAlbums } from "@/lib/content/get-albums";
import { getPhotos } from "@/lib/content/get-photos";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "사진 앨범",
  description: "이성준의 사진 작업을 주제와 장소별 앨범으로 살펴보세요.",
  pathname: "/photo/albums",
});

export const revalidate = 3600;

/** 앨범 목록 — 커버 해석을 위해 사진도 함께 로드. */
export default async function AlbumsPage() {
  const [albums, photos] = await Promise.all([getAlbums(), getPhotos()]);
  return <AlbumsView albums={albums} photos={photos} />;
}
