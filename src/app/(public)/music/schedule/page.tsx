import { MusicScheduleView } from "@/features/music/MusicScheduleView";
import { getMusicSchedule } from "@/lib/content/get-music-schedule";

export const revalidate = 3600;

/** 음악 — 공연 일정 (/music/schedule). */
export default async function MusicSchedulePage() {
  const schedule = await getMusicSchedule();
  return <MusicScheduleView schedule={schedule} />;
}
