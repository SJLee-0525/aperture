import {
  buildProfileContext,
  resolveProfileReferences,
} from "@/features/chat/_lib/build-profile-context";
import { ROUTES } from "@/constants/routes";
import { getChatErrorMessage, type ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";
import {
  buildRagQueryText,
  selectChatIntentWithClassifier,
  type ChatIntent,
  type ProfileSection,
} from "@/features/chat/_lib/chat-intent";
import type { ChatIntentClassifier } from "@/features/chat/_lib/openai-intent-classifier";
import {
  ChatRateLimitConfigurationError,
  type ChatRateLimiter,
} from "@/features/chat/_lib/chat-rate-limit";
import {
  ChatProviderUnavailableError,
  type ChatProvider,
} from "@/features/chat/_lib/chat-provider";
import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import { ChatRequestError, parseChatRequest } from "@/features/chat/_lib/chat-schema";
import type { Lang } from "@/types/lang";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { ChatLink } from "@/types/chat";
import type { RagQuery } from "@/types/rag";

// route.ts의 maxDuration(60초 — Fluid Compute 미활성 Hobby 한도 안)보다 5초 여유를
// 둔다 — Vercel이 함수를 먼저 끊으면 TIMEOUT 에러 이벤트 대신 연결이 그냥 끊긴다.
// 예산 배분: 인텐트 분류(CHAT_INTENT_TIMEOUT_MS) + primary 무응답 상한
// (chat-provider.ts) + 폴백 나머지 — 세 값은 이 총량 안에서 함께 조정한다.
const DEFAULT_TIMEOUT_MS = 55_000;
const MAX_BODY_BYTES = 20_000;
const STREAM_MEDIA_TYPE = "application/x-ndjson";
const ALLOWED_ACTION_ROUTES = new Set<string>([
  ROUTES.CONTACT,
  ROUTES.DEV,
  ROUTES.DEV_ABOUT,
  ROUTES.DEV_CAREER,
  ROUTES.DEV_PROJECTS,
  ROUTES.MUSIC,
  ROUTES.MUSIC_ABOUT,
  ROUTES.MUSIC_CAREER,
  ROUTES.MUSIC_MEDIA,
  ROUTES.PHOTO,
  ROUTES.PHOTO_ABOUT,
  ROUTES.PHOTO_ALBUMS,
  ROUTES.PHOTO_MAP,
]);

type ChatHandlerDependencies = {
  provider: ChatProvider;
  buildContext?: (
    lang: Lang,
    sections?: ProfileSection[],
    query?: RagQuery,
    signal?: AbortSignal,
  ) => Promise<string>;
  resolveReferences?: (references: ChatReferenceRequest[], lang: Lang) => Promise<ChatReference[]>;
  rateLimiter?: ChatRateLimiter;
  intentClassifier?: ChatIntentClassifier;
  timeoutMs?: number;
};

const getHeaderLang = (request: Request): Lang => {
  const languages = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return languages.startsWith("en") ? "en" : "ko";
};

const getBodyLang = (body: unknown, fallback: Lang): Lang => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fallback;
  const lang = (body as Record<string, unknown>).lang;
  return lang === "ko" || lang === "en" ? lang : fallback;
};

const jsonError = (status: number, code: ChatErrorCode, lang: Lang, headers?: HeadersInit) =>
  Response.json({ error: { code, message: getChatErrorMessage(code, lang) } }, { status, headers });

const sanitizeLinks = (
  links: ChatLink[] | undefined,
  references: ChatReference[] | undefined,
): ChatLink[] | undefined => {
  const referencedSections = new Set(
    references?.map(({ type }) => (type === "project" ? ROUTES.DEV : `/${type}`)),
  );
  const safe = links
    ?.filter(
      ({ href, label }) =>
        label.trim() &&
        ALLOWED_ACTION_ROUTES.has(href.split("?")[0] ?? "") &&
        !Array.from(referencedSections).some(
          (section) => href === section || href.startsWith(`${section}/`),
        ),
    )
    .slice(0, 2);
  return safe?.length ? safe : undefined;
};

const publicErrorFor = (
  error: unknown,
  timedOut: boolean,
): { status: number; code: ChatErrorCode } => {
  if (timedOut) return { status: 504, code: "TIMEOUT" };
  if (error instanceof ChatProviderUnavailableError) {
    return { status: 503, code: "PROVIDER_UNAVAILABLE" };
  }
  if (error instanceof ChatUpstreamError) {
    if (error.kind === "rate-limit") return { status: 429, code: "RATE_LIMIT" };
    if (error.kind === "blocked") return { status: 422, code: "CONTENT_BLOCKED" };
    if (error.kind === "unavailable") return { status: 503, code: "UPSTREAM_ERROR" };
  }
  return { status: 502, code: "UPSTREAM_ERROR" };
};

const handleChatRequest = async (
  request: Request,
  {
    provider,
    buildContext = buildProfileContext,
    resolveReferences = resolveProfileReferences,
    rateLimiter,
    intentClassifier,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: ChatHandlerDependencies,
): Promise<Response> => {
  let responseLang = getHeaderLang(request);
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError(400, "REQUEST_TOO_LARGE", responseLang);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError(400, "REQUEST_READ_FAILED", responseLang);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonError(400, "REQUEST_TOO_LARGE", responseLang);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "INVALID_JSON", responseLang);
  }
  responseLang = getBodyLang(parsedBody, responseLang);

  let chatRequest;
  try {
    chatRequest = parseChatRequest(parsedBody);
  } catch (error) {
    if (error instanceof ChatRequestError) return jsonError(400, error.code, responseLang);
    return jsonError(400, "INVALID_BODY", responseLang);
  }
  if (rateLimiter) {
    let rateLimit;
    try {
      rateLimit = await rateLimiter(request);
    } catch (error) {
      if (error instanceof ChatRateLimitConfigurationError) {
        return jsonError(503, "RATE_LIMIT_UNAVAILABLE", responseLang, { "Retry-After": "60" });
      }
      return jsonError(503, "RATE_LIMIT_UNAVAILABLE", responseLang);
    }
    if (!rateLimit.allowed) {
      return jsonError(429, "TOO_MANY_REQUESTS", responseLang, {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      });
    }
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromRequest = () => controller.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortFromRequest, { once: true });
  if (request.signal.aborted) abortFromRequest();

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      const error = new DOMException("Chat request timed out", "TimeoutError");
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  const cleanup = () => {
    if (timeout) clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortFromRequest);
  };

  let chatIntent: ChatIntent;
  try {
    chatIntent = await Promise.race([
      selectChatIntentWithClassifier(chatRequest.messages, controller.signal, intentClassifier),
      timeoutPromise,
    ]);
  } catch (error) {
    cleanup();
    const { status, code } = publicErrorFor(error, timedOut);
    return jsonError(status, code, responseLang);
  }
  const profileSections = chatIntent.sections;
  const shouldLoadProfile = profileSections.length > 0;
  // 분류기가 만든 독립 검색어·키워드를 우선 사용하고, 없으면 후속 질문 맥락을 복원한 휴리스틱 쿼리.
  const ragQuery: RagQuery = {
    text: chatIntent.searchQuery ?? buildRagQueryText(chatRequest.messages),
    keywords: chatIntent.searchKeywords,
  };

  const generateMessage = async (onContentDelta?: (delta: string) => void) => {
    const profileContext = shouldLoadProfile
      ? await buildContext(chatRequest.lang, profileSections, ragQuery, controller.signal)
      : "# PROFILE_CONTEXT\nNo portfolio lookup was needed for this conversational turn.";
    const result = await provider({
      instructions: buildChatInstructions(chatRequest.lang, profileContext),
      messages: chatRequest.messages,
      lang: chatRequest.lang,
      signal: controller.signal,
      onContentDelta,
    });
    const content = result.content.trim();
    if (!content) throw new Error("Provider returned an empty response");
    // 참조 카드는 부가 정보다 — 조회 실패가 이미 완성된(스트리밍이면 이미 보여준)
    // 답변을 폐기하게 두지 않고 카드만 포기한다.
    const references = result.references?.length
      ? await resolveReferences(result.references, chatRequest.lang).catch((error: unknown) => {
          console.warn(
            "[chat] reference resolution failed; sending answer without references:",
            error,
          );
          return undefined;
        })
      : undefined;

    return {
      role: "assistant" as const,
      content,
      links: sanitizeLinks(result.links, references),
      references: references?.length ? references : undefined,
    };
  };

  const run = (onContentDelta?: (delta: string) => void) =>
    Promise.race([generateMessage(onContentDelta), timeoutPromise]);

  if (request.headers.get("accept")?.includes(STREAM_MEDIA_TYPE)) {
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const send = (event: object) => {
          if (cancelled) return;
          streamController.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        if (shouldLoadProfile) send({ type: "status", status: "portfolio-search" });

        void run((delta) => send({ type: "delta", content: delta }))
          .then((message) => send({ type: "done", message }))
          .catch((error: unknown) => {
            const { status, code } = publicErrorFor(error, timedOut);
            send({
              type: "error",
              code,
              message: getChatErrorMessage(code, responseLang),
              retryable: status >= 500,
            });
          })
          .finally(() => {
            cleanup();
            if (!cancelled) streamController.close();
          });
      },
      cancel(reason) {
        cancelled = true;
        controller.abort(reason);
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": `${STREAM_MEDIA_TYPE}; charset=utf-8`,
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  try {
    const message = await run();

    return Response.json({ message });
  } catch (error) {
    const { status, code } = publicErrorFor(error, timedOut);
    return jsonError(status, code, responseLang);
  } finally {
    cleanup();
  }
};

export { handleChatRequest, MAX_BODY_BYTES };
