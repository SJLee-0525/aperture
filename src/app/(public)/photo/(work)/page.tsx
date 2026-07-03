import { Suspense } from "react";

import { GalleryView } from "@/features/gallery/_components/GalleryView";
import { getPhotos } from "@/lib/content/get-photos";
import { getTags } from "@/lib/content/get-tags";

export const revalidate = 3600;

/** 작업(Work) — 사진 그리드 + 필터. GalleryView가 useSearchParams(?q)를 읽어 Suspense로 감쌈. */
export default async function WorkPage() {
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);

  return (
    <Suspense>
      <GalleryView photos={photos} tags={tags} />
    </Suspense>
  );
}
