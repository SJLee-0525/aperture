import { Suspense } from "react";

import { MusicWorksView } from "@/features/music/MusicWorksView";
import { getMusicWorks } from "@/lib/content/get-music-works";

export const revalidate = 3600;

/** 음악 — 연주 목록 (/music). MusicWorksView 가 ?work= 딥링크(useSearchParams)를 읽어 Suspense. */
export default async function MusicPage() {
  const works = await getMusicWorks();
  return (
    <Suspense>
      <MusicWorksView works={works} />
    </Suspense>
  );
}
