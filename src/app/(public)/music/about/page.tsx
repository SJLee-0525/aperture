import { MusicAboutView } from "@/features/music/_components/MusicAboutView";
import { getMusicAwards, getMusicConfig, getMusicMedia, getMusicWorks } from "@/lib/content/music";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "피아니스트 소개",
  description: "이성준의 음악 활동과 레퍼토리를 소개합니다.",
  pathname: "/music/about",
});

export const revalidate = 3600;

/** 음악 — 소개 (/music/about): intro + 통계·레퍼토리(연주/수상/영상에서 파생).
 *  파생에 쓰는 연주 필드(subtitle·venue)와 개수만 투영해 직렬화. */
export default async function MusicAboutPage() {
  const [config, works, awards, media] = await Promise.all([
    getMusicConfig(),
    getMusicWorks(),
    getMusicAwards(),
    getMusicMedia(),
  ]);
  const workFacts = works.map(({ subtitle, venue }) => ({ subtitle, venue }));
  return (
    <MusicAboutView
      intro={config.intro}
      workFacts={workFacts}
      awardCount={awards.length}
      mediaCount={media.length}
    />
  );
}
