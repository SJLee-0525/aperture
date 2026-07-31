import {
  buildProfileContext,
  resolveProfileReferences,
} from "@/features/chat/_lib/build-profile-context";
import { ROUTES } from "@/constants/routes";
import { getChatErrorMessage, type ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";
import {
  ChatRateLimitConfigurationError,
  type ChatRateLimiter,
} from "@/features/chat/_lib/chat-rate-limit";
import {
  GeminiBlockedError,
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
  buildContext?: (lang: Lang) => Promise<string>;
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

  try {
    const message = await Promise.race([
      (async () => {
        const profileContext = await buildContext(chatRequest.lang);
        const result = await provider({
          instructions: buildChatInstructions(chatRequest.lang, profileContext),
          messages: chatRequest.messages,
          lang: chatRequest.lang,
          signal: controller.signal,
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
      })(),
      timeoutPromise,
    ]);

    return Response.json({ message });
  } catch (error) {
    if (timedOut) return jsonError(504, "TIMEOUT", responseLang);
    if (error instanceof ChatProviderUnavailableError) {
      return jsonError(503, "PROVIDER_UNAVAILABLE", responseLang);
    }
    if (error instanceof GeminiRateLimitError) {
      return jsonError(429, "RATE_LIMIT", responseLang);
    }
    if (error instanceof GeminiBlockedError) {
      return jsonError(422, "CONTENT_BLOCKED", responseLang);
    }
    if (error instanceof GeminiServiceUnavailableError) {
      return jsonError(503, "UPSTREAM_ERROR", responseLang);
    }
    return jsonError(502, "UPSTREAM_ERROR", responseLang);
  } finally {
    if (timeout) clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortFromRequest);
  }
};

export { handleChatRequest, MAX_BODY_BYTES };
