import { MusicMediaView } from "@/features/music/_components/MusicMediaView";
import { getMusicMedia } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Performance Videos",
  description: "피아니스트 이성준의 공연과 연주 영상을 소개합니다.",
  pathname: "/music/media",
});

export const revalidate = 3600;

/** 음악 — 영상 (/music/media). */
export default async function MusicMediaPage() {
  const media = await getMusicMedia();
  return <MusicMediaView media={media} />;
}
