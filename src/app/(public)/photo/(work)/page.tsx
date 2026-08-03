import { Suspense } from "react";

import { GalleryView } from "@/features/gallery/_components/GalleryView";
import { getPhotos, getTags } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";
import { toGalleryPhotos } from "@/types/gallery-photo";

export const metadata = pageMetadata({
  title: "Photography",
  description: "사진작가 이성준의 사진 작업을 주제와 촬영 정보별로 소개합니다.",
  pathname: "/photo",
});

export const revalidate = 3600;

/** 작업(Work) — 사진 그리드 + 필터. GalleryView가 useSearchParams(?q)를 읽어 Suspense로 감쌈. */
export default async function WorkPage() {
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);

  return (
    <Suspense>
      <GalleryView photos={toGalleryPhotos(photos)} tags={tags} />
    </Suspense>
  );
}
