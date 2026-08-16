import { AboutSection } from "@/components/AboutSection";

import { DICTIONARY } from "@/constants/dictionary";
import { pickText } from "@/lib/i18n/pick-text";

import type { Lang } from "@/types/lang";
import type { LocalizedText } from "@/types/localized";
import type { MusicWork } from "@/types/music";

/** eyebrow 역할 라벨 — 태그라인 규칙상 언어 무관(고정). */
const EYEBROW = "Pianist";

/** 레퍼토리·무대 파생에 쓰는 연주 필드만 — 전체 MusicWork(프로그램·포스터)를 직렬화하지 않는다. */
type WorkFact = Pick<MusicWork, "subtitle" | "venue">;

type Props = {
  lang: Lang;
  /** site/music 중 이 뷰가 소비하는 유일한 필드 */
  intro: LocalizedText;
  workFacts: WorkFact[];
  awardCount: number;
  mediaCount: number;
};

/**
 * 음악 소개 — intro 요약·본문 + 통계(연주/수상/영상/무대) + 레퍼토리·무대·장르. 레이아웃은 공통 AboutSection.
 *
 * 서버 컴포넌트다. 파생 결과만 client 인 AboutSection 으로 넘어가고 workFacts 원본은 브라우저로 가지 않는다.
 *
 * @param {Props} props
 * @param {Lang} props.lang
 * @param {LocalizedText} props.intro - site/music 중 이 뷰가 소비하는 유일한 필드
 * @param {WorkFact[]} props.workFacts
 * @param {number} props.awardCount
 * @param {number} props.mediaCount
 * @returns {JSX.Element}
 */
const MusicAboutView = ({ lang, intro, workFacts, awardCount, mediaCount }: Props) => {
  const dict = DICTIONARY[lang];

  // intro 첫 문장 = 요약 헤드라인, 나머지 = 본문 (사진 소개와 동일 패턴)
  const introText = pickText(intro, lang);
  const introSplitAt = introText.indexOf(". ");
  const [summary, body] =
    introSplitAt === -1
      ? [introText, ""]
      : [introText.slice(0, introSplitAt), introText.slice(introSplitAt + 2)];

  // 레퍼토리(작곡가 = subtitle "슈베르트 · D.911" 앞부분)·무대·장르
  const composers = [
    ...new Set(
      workFacts.flatMap((work) => {
        const composer = pickText(work.subtitle, lang).split("·")[0].trim();
        return composer ? [composer] : [];
      }),
    ),
  ];
  const venues = [...new Set(workFacts.map((work) => pickText(work.venue, lang)))];

  return (
    <AboutSection
      lang={lang}
      eyebrow={EYEBROW}
      summary={summary}
      body={body}
      stats={[
        { value: workFacts.length, label: dict.statWorks },
        { value: awardCount, label: dict.statAwards },
        { value: mediaCount, label: dict.statVideos },
        { value: venues.length, label: dict.statStages },
      ]}
      cols={[
        { label: dict.musicRepertoireLabel, items: composers },
        { label: dict.musicVenuesLabel, items: venues },
      ]}
      showMoreLabel={dict.aboutShowMore}
      showLessLabel={dict.aboutShowLess}
    />
  );
};

export { MusicAboutView };
