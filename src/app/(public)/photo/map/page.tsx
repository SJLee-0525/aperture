import { Suspense } from "react";

import { MapView } from "@/features/map/_components/MapView";
import { getPhotos } from "@/lib/content/get-photos";
import { getTags } from "@/lib/content/get-tags";

export const revalidate = 3600;

/** 지도 — MapView가 useSearchParams(?photo=)를 읽어 Suspense로 감쌈. */
export default async function MapPage() {
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);

  return (
    <Suspense>
      <MapView photos={photos} tags={tags} />
    </Suspense>
  );
}
