"use client";

import { useMemo } from "react";

import { AboutSection } from "@/components/AboutSection";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";
import type { SiteConfig } from "@/types/site";

type Props = {
  site: SiteConfig;
  photos: Photo[];
  albums: Album[];
};

/** 소개 — 요약 헤드라인·바이오 + 통계(사진에서 자동 집계) + 카메라·렌즈·활동지역 목록.
 *  이름·연락처는 노출하지 않는다(연락은 /contact 로 일원화). 레이아웃은 공통 AboutSection. */
const AboutView = ({ site, photos, albums }: Props) => {
  const { dict, lang } = useLang();

  // bio 첫 문장 = 요약 헤드라인, 나머지 = 본문 (관리자가 bio만 편집하면 자동 반영)
  const [summary, body] = useMemo(() => {
    const text = pickText(site.bio, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [site.bio, lang]);

  const cameras = useMemo(() => [...new Set(photos.map((photo) => photo.camera))], [photos]);
  const lenses = useMemo(() => [...new Set(photos.map((photo) => photo.lens))], [photos]);
  // 활동 지역 = 장소에서 도시만 추출 (ko "도쿄 미나토구"→도쿄, en "Minato, Tokyo"→Tokyo)
  const regions = useMemo(() => {
    const cityOf = (place: Photo["place"]) => {
      const text = pickText(place, lang);
      return lang === "en" ? (text.split(",").pop() ?? text).trim() : text.split(" ")[0];
    };
    return [...new Set(photos.map((photo) => cityOf(photo.place)))];
  }, [photos, lang]);

  return (
    <AboutSection
      eyebrow="Aperture."
      summary={summary}
      body={body}
      stats={[
        { value: photos.length, label: "PHOTOS" },
        { value: albums.length, label: "ALBUMS" },
        { value: regions.length, label: "LOCATIONS" },
        { value: cameras.length, label: "BODIES" },
      ]}
      cols={[
        { label: dict.cameraLabel, items: cameras },
        { label: dict.lensLabel, items: lenses },
        { label: dict.regionsLabel, items: regions },
      ]}
    />
  );
};

export { AboutView };
