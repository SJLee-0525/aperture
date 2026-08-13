import { NextResponse } from "next/server";

import { adjacentPhotos, serializePhoto } from "@/features/photo-detail/_lib/photo-detail-payload";

import { PUBLIC_CACHE_CONTROL } from "@/constants/cache";
import { getPhotos, getTags } from "@/lib/content/photo";

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * 지도에서 선택한 사진과 인접한 위치 사진을 반환한다.
 * @param {Request} _request Next.js 라우트 요청.
 * @param {Context} context 동적 사진 ID를 담은 라우트 컨텍스트.
 * @param {Promise<{ id: string }>} context.params 사진 ID 파라미터.
 * @returns {Promise<NextResponse>} 직렬화한 사진·태그 또는 404 응답.
 */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);
  const geotagged = photos.filter((photo) => photo.coords != null);
  const selected = adjacentPhotos(geotagged, id);

  if (selected.length === 0) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      photos: selected.map(serializePhoto),
      tags,
    },
    {
      headers: {
        "Cache-Control": PUBLIC_CACHE_CONTROL,
      },
    },
  );
}
