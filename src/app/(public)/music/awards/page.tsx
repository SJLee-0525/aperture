import { MusicAwardsView } from "@/features/music/MusicAwardsView";
import { getMusicAwards } from "@/lib/content/get-music-awards";

export const revalidate = 3600;

/** 음악 — 수상 (/music/awards). */
export default async function MusicAwardsPage() {
  const awards = await getMusicAwards();
  return <MusicAwardsView awards={awards} />;
}
