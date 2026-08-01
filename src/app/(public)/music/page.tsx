import { Suspense } from "react";

import { MusicWorksView } from "@/features/music/_components/MusicWorksView";
import { getMusicWorks } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "연주",
  description: "이성준의 공연과 연주 프로그램을 소개합니다.",
  pathname: "/music",
});

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
