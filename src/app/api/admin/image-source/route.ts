import { NextResponse } from "next/server";

import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";
import { isAllowedStorageSourceUrl } from "@/lib/firebase/storage-source-url";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!(await verifyAdminIdToken(idToken))) return unauthorized();

  const payload = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const sourceUrl = typeof payload?.url === "string" ? payload.url : "";
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  if (!isAllowedStorageSourceUrl(sourceUrl, bucket)) {
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
  if (!isAllowedStorageSourceUrl(source.url, bucket)) {
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
