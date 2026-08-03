import { AlbumsView } from "@/features/albums/_components/AlbumsView";
import { toAlbumCards } from "@/features/albums/_lib/album-cards";
import { getAlbums, getPhotos } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Photo Albums",
  description: "사진작가 이성준의 사진 작업을 주제와 장소별 앨범으로 소개합니다.",
  pathname: "/photo/albums",
});

export const revalidate = 3600;

/** 앨범 목록 — 커버 해석·장수 집계는 서버 투영으로 끝내고 카드 데이터만 직렬화. */
export default async function AlbumsPage() {
  const [albums, photos] = await Promise.all([getAlbums(), getPhotos()]);
  return <AlbumsView albums={toAlbumCards(albums, photos)} />;
}
