import { AboutView } from "@/features/about/_components/AboutView";
import { getAlbums } from "@/lib/content/get-albums";
import { getPhotos } from "@/lib/content/get-photos";
import { getSite } from "@/lib/content/get-site";

export const revalidate = 3600;

/** 소개 — 통계는 사진·앨범에서 자동 집계. */
export default async function AboutPage() {
  const [site, photos, albums] = await Promise.all([getSite(), getPhotos(), getAlbums()]);
  return <AboutView site={site} photos={photos} albums={albums} />;
}
