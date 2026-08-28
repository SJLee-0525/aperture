import { NextResponse } from "next/server";

import { fetchSearchDocuments } from "@/features/search/_lib/fetch-search-documents";

import { PUBLIC_CACHE_CONTROL } from "@/constants/cache";

// Next.js 정적 분석을 위해 리터럴 유지 — 정적 검색 인덱스를 1시간마다 재검증한다.
export const revalidate = 3600;

/**
 * 헤더 검색창 자동완성용 검색 인덱스 — /search 페이지와 같은 문서를 ISR 캐시로 내려준다.
 * 검색창 포커스 시점에 1회만 fetch 되므로 DB 읽기는 재생성 주기당 1회.
 */
export async function GET() {
  return NextResponse.json(await fetchSearchDocuments(), {
    headers: {
      "Cache-Control": PUBLIC_CACHE_CONTROL,
    },
  });
}
