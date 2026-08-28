import { NextResponse } from "next/server";

import { PUBLIC_CACHE_CONTROL } from "@/constants/cache";
import { getDevProject } from "@/lib/content/dev";

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * 공개 개발 프로젝트 하나의 상세 데이터를 반환한다.
 * @param _request Next.js 라우트 요청.
 * @param context 동적 프로젝트 ID를 담은 라우트 컨텍스트.
 * @param context.params 프로젝트 ID 파라미터.
 * @returns 프로젝트 JSON 또는 404 응답.
 */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const project = await getDevProject(id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project, {
    headers: {
      "Cache-Control": PUBLIC_CACHE_CONTROL,
    },
  });
}
