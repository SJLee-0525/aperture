import { NextResponse } from "next/server";

import { getDevProject } from "@/lib/content/dev";

export const revalidate = 3600;

type Context = {
  params: Promise<{ id: string }>;
};

/**
 * 공개 개발 프로젝트 하나의 상세 데이터를 반환한다.
 * @param {Request} _request Next.js 라우트 요청.
 * @param {Context} context 동적 프로젝트 ID를 담은 라우트 컨텍스트.
 * @param {Promise<{ id: string }>} context.params 프로젝트 ID 파라미터.
 * @returns {Promise<NextResponse>} 프로젝트 JSON 또는 404 응답.
 */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const project = await getDevProject(id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
