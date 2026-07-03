import { MusicView } from "@/features/music/MusicView";
import { getMusicAwards } from "@/lib/content/get-music-awards";
import { getMusicConfig } from "@/lib/content/get-music-config";
import { getMusicMedia } from "@/lib/content/get-music-media";
import { getMusicSchedule } from "@/lib/content/get-music-schedule";
import { getMusicWorks } from "@/lib/content/get-music-works";

export const revalidate = 3600;

/** 음악 섹션 (/music) — 연주 목록·공연 일정·수상·영상·연락처. */
export default async function MusicPage() {
  const [works, schedule, awards, media, config] = await Promise.all([
    getMusicWorks(),
    getMusicSchedule(),
    getMusicAwards(),
    getMusicMedia(),
    getMusicConfig(),
  ]);

  return (
    <MusicView
      works={works}
      schedule={schedule}
      awards={awards}
      media={media}
      config={config}
    />
  );
}
