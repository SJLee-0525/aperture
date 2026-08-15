import { NextResponse } from "next/server";

import { searchArticleBodies } from "@/features/search/_lib/search-article-bodies";

import { PUBLIC_CACHE_CONTROL } from "@/constants/cache";

import type { NextRequest } from "next/server";

/**
 * 통합검색의 블로그 본문 일치 — 검색 인덱스(`/api/search-index`)에 없는 본문 전문을
 * 서버에서 대조한다. 브라우저에는 일치한 글 id 와 스니펫만 내려간다.
 *
 * @returns {Promise<NextResponse>} `{ matches: ArticleBodyMatch[] }`.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(
    { matches: await searchArticleBodies(q) },
    { headers: { "Cache-Control": PUBLIC_CACHE_CONTROL } },
  );
}
