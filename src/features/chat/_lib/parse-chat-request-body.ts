import { ChatRequestError, MAX_BODY_BYTES, parseChatRequest } from "@/features/chat/_lib/chat-schema";

import { declaredBodyTooLarge, readLimitedBody } from "@/lib/http/read-limited-body";

import type { ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import type { Lang } from "@/types/lang";

/**
 * 본문을 읽기 전에 정하는 응답 언어.
 * 본문이 유효하지 않아 언어를 못 읽을 때도 오류 메시지는 이 언어로 나간다.
 */
const headerLang = (request: Request): Lang => {
  const languages = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return languages.startsWith("en") ? "en" : "ko";
};

/** 파싱된 본문의 언어. 없거나 지원하지 않으면 헤더 언어를 쓴다. */
const bodyLang = (body: unknown, fallback: Lang): Lang => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fallback;
  const lang = (body as Record<string, unknown>).lang;
  return lang === "ko" || lang === "en" ? lang : fallback;
};

/**
 * 다른 사이트가 방문자의 브라우저로 이 엔드포인트를 부르는 것을 막는다.
 * JSON 본문을 요구해 form 전송을 걸러 내고, Sec-Fetch-Site 로 교차 출처 fetch 를 막는다.
 * 헤더가 없는 요청은 브라우저가 보낸 것이 아니므로 통과시킨다.
 */
const isSameOrigin = (request: Request): boolean => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
};

type ChatRequest = ReturnType<typeof parseChatRequest>;

/** 본문 읽기 결과. 실패는 그대로 공개 오류 응답이 된다. */
type ParsedChatBody =
  | { ok: true; request: ChatRequest; lang: Lang }
  | { ok: false; status: number; code: ChatErrorCode; lang: Lang };

/**
 * 채팅 요청 본문을 읽어 검증한다.
 *
 * 출처 확인, 크기 상한, JSON 파싱, 형식 검증을 한 줄기로 묶는다. 어느 단계에서 멈추든
 * 그때까지 알아낸 가장 정확한 언어로 오류를 돌려준다.
 *
 * 본문은 상한까지만 읽는다. 제한에 걸린 요청이 메모리를 쓰는 양은 그 절단이 정한다.
 */
const parseChatRequestBody = async (request: Request): Promise<ParsedChatBody> => {
  const lang = headerLang(request);
  const fail = (status: number, code: ChatErrorCode, failLang: Lang = lang) =>
    ({ ok: false, status, code, lang: failLang }) as const;

  if (!isSameOrigin(request)) return fail(400, "INVALID_REQUEST_SOURCE");
  if (declaredBodyTooLarge(request.headers, MAX_BODY_BYTES)) return fail(400, "REQUEST_TOO_LARGE");

  let rawBody: string | null;
  try {
    rawBody = await readLimitedBody(request, MAX_BODY_BYTES);
  } catch {
    return fail(400, "REQUEST_READ_FAILED");
  }
  if (rawBody === null) return fail(400, "REQUEST_TOO_LARGE");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return fail(400, "INVALID_JSON");
  }

  const resolvedLang = bodyLang(parsed, lang);
  try {
    return { ok: true, request: parseChatRequest(parsed), lang: resolvedLang };
  } catch (error) {
    if (error instanceof ChatRequestError) return fail(400, error.code, resolvedLang);
    return fail(400, "INVALID_BODY", resolvedLang);
  }
};

export { parseChatRequestBody };
