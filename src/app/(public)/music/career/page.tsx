import { Suspense } from "react";

import { MusicCareerView } from "@/features/music/MusicCareerView";
import { getMusicAwards } from "@/lib/content/get-music-awards";
import { getMusicConfig } from "@/lib/content/get-music-config";

export const revalidate = 3600;

/** 음악 — 경력 (/music/career): 학력·경력 타임라인 + 수상. 수상 모달 ?award= 딥링크(useSearchParams) → Suspense. */
export default async function MusicCareerPage() {
  const [config, awards] = await Promise.all([getMusicConfig(), getMusicAwards()]);
  return (
    <Suspense>
      <MusicCareerView config={config} awards={awards} />
    </Suspense>
  );
}
