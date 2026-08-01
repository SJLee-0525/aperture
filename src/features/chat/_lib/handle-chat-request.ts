import {
  buildProfileContext,
  resolveProfileReferences,
} from "@/features/chat/_lib/build-profile-context";
import { ROUTES } from "@/constants/routes";
import { getChatErrorMessage, type ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";
import { selectProfileSections, type ProfileSection } from "@/features/chat/_lib/chat-intent";
import {
  ChatRateLimitConfigurationError,
  type ChatRateLimiter,
} from "@/features/chat/_lib/chat-rate-limit";
import {
  GeminiBlockedError,
  GeminiMaxTokensError,
  GeminiRateLimitError,
  GeminiServiceUnavailableError,
} from "@/features/chat/_lib/gemini-chat-provider";
import {
  ChatProviderUnavailableError,
  type ChatProvider,
} from "@/features/chat/_lib/chat-provider";
import { ChatRequestError, parseChatRequest } from "@/features/chat/_lib/chat-schema";
import type { Lang } from "@/types/lang";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { ChatLink } from "@/types/chat";

const DEFAULT_TIMEOUT_MS = 15_000;
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
  buildContext?: (lang: Lang, sections?: ProfileSection[]) => Promise<string>;
  resolveReferences?: (references: ChatReferenceRequest[], lang: Lang) => Promise<ChatReference[]>;
  rateLimiter?: ChatRateLimiter;
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
  lang: Lang,
  timedOut: boolean,
): { status: number; code: ChatErrorCode } => {
  if (timedOut) return { status: 504, code: "TIMEOUT" };
  if (error instanceof ChatProviderUnavailableError) {
    return { status: 503, code: "PROVIDER_UNAVAILABLE" };
  }
  if (error instanceof GeminiRateLimitError) return { status: 429, code: "RATE_LIMIT" };
  if (error instanceof GeminiBlockedError) return { status: 422, code: "CONTENT_BLOCKED" };
  if (error instanceof GeminiMaxTokensError) return { status: 502, code: "UPSTREAM_ERROR" };
  if (error instanceof GeminiServiceUnavailableError) {
    return { status: 503, code: "UPSTREAM_ERROR" };
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
  const profileSections = selectProfileSections(chatRequest.messages);
  const shouldLoadProfile = profileSections.length > 0;

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

  const generateMessage = async (onContentDelta?: (delta: string) => void) => {
    const profileContext = shouldLoadProfile
      ? await buildContext(chatRequest.lang, profileSections)
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
    const references = result.references?.length
      ? await resolveReferences(result.references, chatRequest.lang)
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
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const send = (event: object) =>
          streamController.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

        if (shouldLoadProfile) send({ type: "status", status: "portfolio-search" });

        void run((delta) => send({ type: "delta", content: delta }))
          .then((message) => send({ type: "done", message }))
          .catch((error: unknown) => {
            const { status, code } = publicErrorFor(error, responseLang, timedOut);
            send({
              type: "error",
              code,
              message: getChatErrorMessage(code, responseLang),
              retryable: status >= 500,
            });
          })
          .finally(() => {
            cleanup();
            streamController.close();
          });
      },
      cancel(reason) {
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
    const { status, code } = publicErrorFor(error, responseLang, timedOut);
    return jsonError(status, code, responseLang);
  } finally {
    cleanup();
  }
};

export { handleChatRequest, MAX_BODY_BYTES };
