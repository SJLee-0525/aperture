"use client";

import { useMemo } from "react";

import { AboutSection } from "@/components/AboutSection";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { LocalizedText } from "@/types/localized";
import type { Photo } from "@/types/photo";

/** 통계·목록 파생에 필요한 사진 필드만 — 전체 Photo(EXIF·좌표·이미지 메타)를 직렬화하지 않는다. */
type PhotoFact = Pick<Photo, "camera" | "lens" | "place">;

type Props = {
  /** site/config 중 이 뷰가 소비하는 유일한 필드 */
  bio: LocalizedText;
  photoFacts: PhotoFact[];
  albumCount: number;
};

/** 소개 — 요약 헤드라인·바이오 + 통계(사진에서 자동 집계) + 카메라·렌즈·활동지역 목록.
 *  이름·연락처는 노출하지 않는다(연락은 /contact 로 일원화). 레이아웃은 공통 AboutSection. */
const AboutView = ({ bio, photoFacts, albumCount }: Props) => {
  const { dict, lang } = useLang();

  // bio 첫 문장 = 요약 헤드라인, 나머지 = 본문 (관리자가 bio만 편집하면 자동 반영)
  const [summary, body] = useMemo(() => {
    const text = pickText(bio, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [bio, lang]);

  const cameras = useMemo(() => [...new Set(photoFacts.map((fact) => fact.camera))], [photoFacts]);
  const lenses = useMemo(
    () => [
      ...new Set(
        photoFacts.flatMap((fact) => {
          const lens = fact.lens.trim();
          return lens ? [lens] : [];
        }),
      ),
    ],
    [photoFacts],
  );
  // 활동 지역 = 장소에서 도시만 추출 (ko "도쿄 미나토구"→도쿄, en "Minato, Tokyo"→Tokyo)
  const regions = useMemo(() => {
    const cityOf = (place: PhotoFact["place"]) => {
      const text = pickText(place, lang);
      return lang === "en" ? (text.split(",").pop() ?? text).trim() : text.split(" ")[0];
    };
    return [...new Set(photoFacts.map((fact) => cityOf(fact.place)))];
  }, [photoFacts, lang]);

  return (
    <AboutSection
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
