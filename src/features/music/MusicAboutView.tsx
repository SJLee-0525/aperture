"use client";

import { useMemo } from "react";

import { AboutSection } from "@/components/AboutSection";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

/** eyebrow 역할 라벨 — 태그라인 규칙상 언어 무관(고정). */
const EYEBROW = "Pianist";

type Props = {
  config: MusicConfig;
  works: MusicWork[];
  awards: MusicAward[];
  media: MusicMedia[];
};

/** 음악 소개 — intro 요약·본문 + 통계(연주/수상/영상/무대) + 레퍼토리·무대·장르. 레이아웃은 공통 AboutSection. */
const MusicAboutView = ({ config, works, awards, media }: Props) => {
  const { dict, lang } = useLang();

  // intro 첫 문장 = 요약 헤드라인, 나머지 = 본문 (사진 소개와 동일 패턴)
  const [summary, body] = useMemo(() => {
    const text = pickText(config.intro, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [config.intro, lang]);

  // 레퍼토리(작곡가 = subtitle "슈베르트 · D.911" 앞부분)·무대·장르
  const composers = useMemo(
    () => [
      ...new Set(
        works.map((work) => pickText(work.subtitle, lang).split("·")[0].trim()).filter(Boolean),
      ),
    ],
    [works, lang],
  );
  const venues = useMemo(
    () => [...new Set(works.map((work) => pickText(work.venue, lang)))],
    [works, lang],
  );
  const genres = useMemo(
    () => [...new Set(works.map((work) => pickText(work.category, lang)))],
    [works, lang],
  );

  return (
    <AboutSection
      eyebrow={EYEBROW}
      summary={summary}
      body={body}
      stats={[
        { value: works.length, label: "WORKS" },
        { value: awards.length, label: "AWARDS" },
        { value: media.length, label: "VIDEOS" },
        { value: venues.length, label: "STAGES" },
      ]}
      cols={[
        { label: dict.musicRepertoireLabel, items: composers },
        { label: dict.musicVenuesLabel, items: venues },
        { label: dict.musicGenresLabel, items: genres },
      ]}
    />
  );
};

export { MusicAboutView };
