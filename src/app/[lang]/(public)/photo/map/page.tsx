import { Suspense } from "react";

import { MapView } from "@/features/map/_components/MapView";

import { toMapLocations } from "@/features/map/_lib/map-location";

import { getPhotos } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";


import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

import MapLoading from "./loading";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "사진 지도", en: "Photo Map" },
    description: {
      ko: "이성준의 사진을 촬영 장소와 함께 지도로 소개합니다.",
      en: "Photos by Sungjoon Lee on a map of the places they were taken.",
    },
    pathname: "/photo/map",
  });
}

/** 지도 — MapView가 useSearchParams(?photo=)를 읽어 Suspense로 감쌈.
 *  preconnect: 지도 청크가 동적 로드된 뒤에야 CARTO에 접속하므로 DNS+TLS를 미리 끝내 첫 페인트를 당긴다.
 *
 * @returns {Promise<JSX.Element>}
 *  (style.json = basemaps.cartocdn.com, 타일·sprite·glyphs = tiles.basemaps.cartocdn.com — 전부 CORS fetch) */
export default async function MapPage() {
  const photos = await getPhotos();
  const locations = toMapLocations(photos);

  return (
    <>
      <link rel="preconnect" href="https://basemaps.cartocdn.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://tiles.basemaps.cartocdn.com" crossOrigin="anonymous" />
      <Suspense fallback={<MapLoading />}>
        <MapView locations={locations} />
      </Suspense>
    </>
  );
}
