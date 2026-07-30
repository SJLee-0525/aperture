import { MusicMediaView } from "@/features/music/_components/MusicMediaView";
import { getMusicMedia } from "@/lib/content/get-music-media";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "연주 영상",
  description: "이성준의 공연과 연주 영상을 감상하세요.",
  pathname: "/music/media",
});

export const revalidate = 3600;

/** 음악 — 영상 (/music/media). */
export default async function MusicMediaPage() {
  const media = await getMusicMedia();
  return <MusicMediaView media={media} />;
}
