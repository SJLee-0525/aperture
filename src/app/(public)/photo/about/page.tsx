import { AboutView } from "@/features/about/_components/AboutView";
import { getAlbums, getPhotos } from "@/lib/content/photo";
import { getSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "사진작가 소개",
  description: "이성준의 사진 작업 기록을 살펴보세요.",
  pathname: "/photo/about",
});

export const revalidate = 3600;

/** 소개 — 통계는 사진·앨범에서 자동 집계. 파생에 쓰는 필드만 투영해 직렬화. */
export default async function AboutPage() {
  const [site, photos, albums] = await Promise.all([getSite(), getPhotos(), getAlbums()]);
  const photoFacts = photos.map(({ camera, lens, place }) => ({ camera, lens, place }));
  return <AboutView bio={site.bio} photoFacts={photoFacts} albumCount={albums.length} />;
}
