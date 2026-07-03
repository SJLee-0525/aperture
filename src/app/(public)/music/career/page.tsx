import { MusicCareerView } from "@/features/music/MusicCareerView";
import { getMusicAwards } from "@/lib/content/get-music-awards";
import { getMusicConfig } from "@/lib/content/get-music-config";

export const revalidate = 3600;

/** 음악 — 경력 (/music/career): 학력·경력 타임라인 + 수상. */
export default async function MusicCareerPage() {
  const [config, awards] = await Promise.all([getMusicConfig(), getMusicAwards()]);
  return <MusicCareerView config={config} awards={awards} />;
}
