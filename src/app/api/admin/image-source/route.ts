import { NextResponse } from "next/server";

import { adminGateResponse } from "@/lib/auth/admin-gate";
import { isAllowedStorageSourceUrl } from "@/lib/supabase/storage-source-url";

// 다른 POST 라우트 셋과 같은 선언. 없으면 런타임 선택이 기본값에 맡겨져,
// 원본을 스트림으로 읽는 이 경로가 edge 로 바뀌면 동작이 달라진다.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/**
 * 응답 본문을 상한까지만 읽는다. `Content-Length` 가 없는 응답에도 상한이 걸린다.
 * 헤더 선검사만으로는 `Number(null) === 0` 이라 길이를 밝히지 않는 응답이 통과하고,
 * `arrayBuffer()` 가 상한 없이 전부 버퍼링한 뒤에야 거절된다.
 *
 * @param {Response} response 원본 이미지 응답.
 * @param {number} limit 허용할 최대 바이트 수.
 * @returns {Promise<Uint8Array | null>} 상한 이내면 본문, 넘으면 `null`.
 */
const readLimitedBody = async (response: Response, limit: number): Promise<Uint8Array | null> => {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) return null;
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

/**
 * 인증된 관리자가 요청한 Storage 원본 이미지를 프록시한다.
 * @param {Request} request Bearer 토큰과 원본 이미지 URL을 담은 요청.
 * @returns {Promise<Response>} 이미지 응답 또는 인증·입력 오류 응답.
 */
export async function POST(request: Request) {
  const denied = await adminGateResponse(request);
  if (denied) return denied;

  const payload = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const sourceUrl = typeof payload?.url === "string" ? payload.url : "";
  if (!isAllowedStorageSourceUrl(sourceUrl)) {
    return NextResponse.json({ error: "허용되지 않은 이미지 URL입니다." }, { status: 400 });
  }

  // 리다이렉트를 따라가면 최종 URL 을 재검증하기 전에 중간 홉으로 요청이 이미 나간다.
  // Storage 공개 객체는 리다이렉트를 쓰지 않으므로 첫 응답이 리다이렉트면 그대로 실패다.
  const source = await fetch(sourceUrl, { cache: "no-store", redirect: "error" }).catch(
    () => null,
  );
  if (!source?.ok) {
    return NextResponse.json(
      { error: `원본 이미지 다운로드 실패 (${source?.status ?? "network"})` },
      { status: 502 },
    );
  }
  // fetch 가 리다이렉트를 거부하므로 여기 도달한 응답의 URL 은 요청 URL 과 같다.
  // 계약이 바뀌었을 때 조용히 넘어가지 않도록 한 번 더 확인한다.
  if (!isAllowedStorageSourceUrl(source.url)) {
    return NextResponse.json({ error: "허용되지 않은 리디렉션입니다." }, { status: 502 });
  }

  const contentType = source.headers.get("content-type") ?? "";
  const declaredLength = source.headers.get("content-length");
  if (
    !contentType.startsWith("image/") ||
    (declaredLength !== null && Number(declaredLength) > MAX_SOURCE_BYTES)
  ) {
    return NextResponse.json({ error: "지원하지 않는 이미지 응답입니다." }, { status: 502 });
  }

  const bytes = await readLimitedBody(source, MAX_SOURCE_BYTES);
  if (!bytes) {
    return NextResponse.json({ error: "원본 이미지가 10MB를 초과합니다." }, { status: 413 });
  }

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(bytes.byteLength),
      "Content-Type": contentType,
    },
  });
}
