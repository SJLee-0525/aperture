import { Suspense } from "react";

import { MapView } from "@/features/map/_components/MapView";
import { toMapLocations } from "@/features/map/_types/map-location";
import { getPhotos } from "@/lib/content/get-photos";

export const revalidate = 3600;

/** 지도 — MapView가 useSearchParams(?photo=)를 읽어 Suspense로 감쌈. */
export default async function MapPage() {
  const photos = await getPhotos();
  const locations = toMapLocations(photos);

  return (
    <Suspense>
      <MapView locations={locations} />
    </Suspense>
  );
}
