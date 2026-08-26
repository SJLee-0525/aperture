import { NextResponse } from "next/server";

import { authorizeAdminToken, bearerToken } from "@/lib/auth/authorize-admin-token";
import { isAllowedStorageSourceUrl } from "@/lib/supabase/storage-source-url";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const tooManyRequests = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: "Too many failed attempts" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );

/**
 * 인증된 관리자가 요청한 Storage 원본 이미지를 프록시한다.
 * @param {Request} request Bearer 토큰과 원본 이미지 URL을 담은 요청.
 * @returns {Promise<Response>} 이미지 응답 또는 인증·입력 오류 응답.
 */
export async function POST(request: Request) {
  const verdict = await authorizeAdminToken(bearerToken(request));
  if (verdict.status === "throttled") return tooManyRequests(verdict.retryAfterSeconds);
  if (verdict.status !== "ok") return unauthorized();

  const payload = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const sourceUrl = typeof payload?.url === "string" ? payload.url : "";
  if (!isAllowedStorageSourceUrl(sourceUrl)) {
    return NextResponse.json({ error: "허용되지 않은 이미지 URL입니다." }, { status: 400 });
  }

  const source = await fetch(sourceUrl, { cache: "no-store", redirect: "follow" }).catch(
    () => null,
  );
  if (!source?.ok) {
    return NextResponse.json(
      { error: `원본 이미지 다운로드 실패 (${source?.status ?? "network"})` },
      { status: 502 },
    );
  }
  // redirect 를 따라간 최종 URL 재검증 — 허용 원본이 다른 호스트로 넘기는 SSRF 를 막는다.
  if (!isAllowedStorageSourceUrl(source.url)) {
    return NextResponse.json({ error: "허용되지 않은 리디렉션입니다." }, { status: 502 });
  }

  const contentType = source.headers.get("content-type") ?? "";
  const contentLength = Number(source.headers.get("content-length") ?? 0);
  if (!contentType.startsWith("image/") || contentLength > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: "지원하지 않는 이미지 응답입니다." }, { status: 502 });
  }

  const bytes = await source.arrayBuffer();
  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: "원본 이미지가 10MB를 초과합니다." }, { status: 413 });
  }

  return new Response(bytes, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(bytes.byteLength),
      "Content-Type": contentType,
    },
  });
}
