import { MusicMediaView } from "@/features/music/_components/MusicMediaView";
import { getMusicMedia } from "@/lib/content/get-music-media";

export const revalidate = 3600;

/** 음악 — 영상 (/music/media). */
export default async function MusicMediaPage() {
  const media = await getMusicMedia();
  return <MusicMediaView media={media} />;
}
