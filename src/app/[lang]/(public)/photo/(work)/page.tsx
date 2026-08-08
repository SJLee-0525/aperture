import type { Metadata } from "next";
import { Suspense } from "react";

import { GalleryView } from "@/features/gallery/_components/GalleryView";
import { getPhotos, getTags } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";
import { toGalleryPhotos } from "@/types/gallery-photo";

import type { Lang } from "@/types/lang";

import WorkLoading from "./loading";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "사진 작업", en: "Photography" },
    description: {
      ko: "사진작가 이성준의 사진 작업을 주제와 촬영 정보별로 소개합니다.",
      en: "Photography by Sungjoon Lee, organized by theme and shooting details.",
    },
    pathname: "/photo",
  });
}

export const revalidate = 3600;

/**
 * 작업(Work) — 사진 그리드 + 필터. GalleryView가 useSearchParams(?q)를 읽어 Suspense로 감쌈.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function WorkPage() {
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);

  return (
    <Suspense fallback={<WorkLoading />}>
      <GalleryView photos={toGalleryPhotos(photos)} tags={tags} />
    </Suspense>
  );
}
