import { buildPhotoDetailResponse } from "@/features/photo-detail/_lib/photo-detail-response";

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * 지도에서 선택한 사진과 인접한 위치 사진을 반환한다.
 *
 * @param {Request} _request Next.js 라우트 요청.
 * @param {Context} context 동적 사진 ID를 담은 라우트 컨텍스트.
 * @returns {Promise<NextResponse>} 직렬화한 사진·태그 또는 404 응답.
 */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  // 지도는 좌표가 있는 사진만 이웃으로 삼는다.
  return buildPhotoDetailResponse(id, (photo) => photo.coords != null);
}
