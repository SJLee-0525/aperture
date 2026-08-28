import { buildPhotoDetailResponse } from "@/features/photo-detail/_lib/photo-detail-response";

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * 선택한 사진과 앞뒤 사진의 상세 데이터를 반환한다.
 *
 * @param _request Next.js 라우트 요청.
 * @param context 동적 사진 ID를 담은 라우트 컨텍스트.
 * @returns 직렬화한 사진·태그 또는 404 응답.
 */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  return buildPhotoDetailResponse(id);
}
