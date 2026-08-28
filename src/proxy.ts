import { type NextRequest, NextResponse } from "next/server";

import { decideLocale } from "@/features/lang/_lib/locale-negotiation";

import { LOCALE_PREFERENCE_COOKIE } from "@/constants/locale-preference";

/** 루트 언어 이동을 허용하는 읽기 전용 HTTP 메서드. */
const ROUTABLE_METHODS = new Set(["GET", "HEAD"]);

/**
 * 언어가 없는 랜딩만 사용자 선호에 따라 선택한다. 명시적 `/ko`·`/en` 경로는 matcher 밖이다.
 *
 * @param request - 루트 matcher가 전달한 Next.js 요청.
 * @returns GET·HEAD의 307 언어 이동 또는 그 밖의 메서드 통과 응답.
 */
export function proxy(request: NextRequest): NextResponse {
  if (!ROUTABLE_METHODS.has(request.method)) return NextResponse.next();

  const cookieValues = request.cookies.getAll(LOCALE_PREFERENCE_COOKIE).map(({ value }) => value);
  const { lang } = decideLocale(cookieValues, request.headers.get("accept-language"));
  const destination = request.nextUrl.clone();
  destination.pathname = `/${lang}`;

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: "/" };
