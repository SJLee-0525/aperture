import { AboutSection } from "@/components/AboutSection";

import { DICTIONARY } from "@/constants/dictionary";
import { pickText } from "@/lib/i18n/pick-text";

import type { Lang } from "@/types/lang";
import type { LocalizedText } from "@/types/localized";
import type { Photo } from "@/types/photo";

/** 통계·목록 파생에 필요한 사진 필드만 — 전체 Photo(EXIF·좌표·이미지 메타)를 직렬화하지 않는다. */
type PhotoFact = Pick<Photo, "camera" | "lens" | "place">;

type Props = {
  lang: Lang;
  /** site/config 중 이 뷰가 소비하는 유일한 필드 */
  bio: LocalizedText;
  photoFacts: PhotoFact[];
  albumCount: number;
};

/** 소개 — 요약 헤드라인·바이오 + 통계(사진에서 자동 집계) + 카메라·렌즈·활동지역 목록.
 *
 * 서버 컴포넌트다. 파생 결과(문자열·숫자·목록)만 client 인 AboutSection 으로 넘어가고
 * photoFacts 원본과 집계 코드는 브라우저로 가지 않는다.
 *
 * @param {Props} props
 * @param {Lang} props.lang
 * @param {LocalizedText} props.bio - site/config 중 이 뷰가 소비하는 유일한 필드
 * @param {PhotoFact[]} props.photoFacts
 * @param {number} props.albumCount
 * @returns {JSX.Element}
 *  이름·연락처는 노출하지 않는다(연락은 /contact 로 일원화). 레이아웃은 공통 AboutSection. */
const AboutView = ({ lang, bio, photoFacts, albumCount }: Props) => {
  const dict = DICTIONARY[lang];

  // bio 첫 문장 = 요약 헤드라인, 나머지 = 본문 (관리자가 bio만 편집하면 자동 반영)
  const bioText = pickText(bio, lang);
  const bioSplitAt = bioText.indexOf(". ");
  const [summary, body] =
    bioSplitAt === -1
      ? [bioText, ""]
      : [bioText.slice(0, bioSplitAt), bioText.slice(bioSplitAt + 2)];

  const cameras = [...new Set(photoFacts.map((fact) => fact.camera))];
  const lenses = [
    ...new Set(
      photoFacts.flatMap((fact) => {
        const lens = fact.lens.trim();
        return lens ? [lens] : [];
      }),
    ),
  ];
  // 활동 지역 = 장소에서 도시만 추출 (ko "도쿄 미나토구"→도쿄, en "Minato, Tokyo"→Tokyo)
  const cityOf = (place: PhotoFact["place"]) => {
    const text = pickText(place, lang);
    return lang === "en" ? (text.split(",").pop() ?? text).trim() : text.split(" ")[0];
  };
  const regions = [...new Set(photoFacts.map((fact) => cityOf(fact.place)))];

  return (
    <AboutSection
      lang={lang}
      eyebrow="Aperture."
      summary={summary}
      body={body}
      stats={[
        { value: photoFacts.length, label: dict.statPhotos },
        { value: albumCount, label: dict.statAlbums },
        { value: regions.length, label: dict.statLocations },
        { value: cameras.length, label: dict.statCameras },
      ]}
      cols={[
        { label: dict.cameraLabel, items: cameras },
        { label: dict.lensLabel, items: lenses },
      ]}
      showMoreLabel={dict.aboutShowMore}
      showLessLabel={dict.aboutShowLess}
    />
  );
};

export { AboutView };
