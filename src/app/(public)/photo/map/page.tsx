import { Suspense } from "react";

import { MapView } from "@/features/map/_components/MapView";
import { toMapLocations } from "@/features/map/_types/map-location";
import { getPhotos } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Photo Map",
  description: "사진작가 이성준의 사진을 촬영 장소와 함께 지도로 소개합니다.",
  pathname: "/photo/map",
});

export const revalidate = 3600;

/** 지도 — MapView가 useSearchParams(?photo=)를 읽어 Suspense로 감쌈.
 *  preconnect: 지도 청크가 동적 로드된 뒤에야 CARTO에 접속하므로 DNS+TLS를 미리 끝내 첫 페인트를 당긴다.
 *  (style.json = basemaps.cartocdn.com, 타일·sprite·glyphs = tiles.basemaps.cartocdn.com — 전부 CORS fetch) */
export default async function MapPage() {
  const photos = await getPhotos();
  const locations = toMapLocations(photos);

  return (
    <>
      <link rel="preconnect" href="https://basemaps.cartocdn.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://tiles.basemaps.cartocdn.com" crossOrigin="anonymous" />
      <Suspense>
        <MapView locations={locations} />
      </Suspense>
    </>
  );
}
