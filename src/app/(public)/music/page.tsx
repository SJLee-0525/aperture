import { MusicWorksView } from "@/features/music/MusicWorksView";
import { getMusicWorks } from "@/lib/content/get-music-works";

export const revalidate = 3600;

/** 음악 — 연주 목록 (/music). */
export default async function MusicPage() {
  const works = await getMusicWorks();
  return <MusicWorksView works={works} />;
}
