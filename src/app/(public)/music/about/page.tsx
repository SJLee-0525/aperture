import { MusicAboutView } from "@/features/music/_components/MusicAboutView";
import { getMusicAwards } from "@/lib/content/get-music-awards";
import { getMusicConfig } from "@/lib/content/get-music-config";
import { getMusicMedia } from "@/lib/content/get-music-media";
import { getMusicWorks } from "@/lib/content/get-music-works";

export const revalidate = 3600;

/** 음악 — 소개 (/music/about): intro + 통계·레퍼토리(연주/수상/영상에서 파생). */
export default async function MusicAboutPage() {
  const [config, works, awards, media] = await Promise.all([
    getMusicConfig(),
    getMusicWorks(),
    getMusicAwards(),
    getMusicMedia(),
  ]);
  return <MusicAboutView config={config} works={works} awards={awards} media={media} />;
}
