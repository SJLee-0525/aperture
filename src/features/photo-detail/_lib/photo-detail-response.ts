import { NextResponse } from "next/server";

import { adjacentPhotos, serializePhoto } from "@/features/photo-detail/_lib/photo-detail-payload";

import { PUBLIC_CACHE_CONTROL } from "@/constants/cache";
import { getPhotos, getTags } from "@/lib/content/photo";

import type { Photo } from "@/types/photo";

/**
 * 선택한 사진과 앞뒤 사진의 상세 응답을 만든다.
 *
 * 작업 그리드와 지도가 각자 라우트를 두면서 조회·직렬화·404·캐시 헤더를 복제하고 있어,
 * 한쪽만 고쳐지는 것을 막으려고 한 곳에 모았다. 두 경로의 차이는 후보 사진 필터뿐이다.
 *
 * @param {string} id 선택한 사진 ID.
 * @param {(photo: Photo) => boolean} [filter] 앞뒤 사진을 고를 후보 조건.
 * @returns {Promise<NextResponse>} 직렬화한 사진·태그 또는 404 응답.
 */
const buildPhotoDetailResponse = async (
  id: string,
  filter?: (photo: Photo) => boolean,
): Promise<NextResponse> => {
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);
  const candidates = filter ? photos.filter(filter) : photos;
  const selected = adjacentPhotos(candidates, id);

  if (selected.length === 0) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json(
    { photos: selected.map(serializePhoto), tags },
    { headers: { "Cache-Control": PUBLIC_CACHE_CONTROL } },
  );
};

export { buildPhotoDetailResponse };
