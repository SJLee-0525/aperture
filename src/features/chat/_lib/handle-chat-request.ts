import {
  buildProfileContextFromSnapshot,
  formatProfileReferences,
  loadProfileSnapshot,
  resolveReferencesWithRefresh,
  type ProfileSnapshot,
} from "@/features/chat/_lib/build-profile-context";
import { ROUTES } from "@/constants/routes";
import { getChatErrorMessage, type ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";
import {
  buildScreenContextLookup,
  resolveScreenContext,
} from "@/features/chat/_lib/resolve-chat-screen-context";
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
import { getChatProfileData, type ChatProfileData } from "@/lib/content/chat";
import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import {
  buildPhotoFilterHref,
  parsePhotoFilterQueryStrict,
  type PhotoFilterVocabulary,
} from "@/lib/photo-filter-query";
import type { Lang } from "@/types/lang";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { ChatLink } from "@/types/chat";
import type { RagQuery } from "@/types/rag";

// route.ts의 maxDuration(60초)보다 5초 먼저 요청을 끝낸다. Vercel이 함수를 먼저
// 종료하면 TIMEOUT 이벤트를 보낼 수 없다.
// 예산 배분: 인텐트 분류(CHAT_INTENT_TIMEOUT_MS) + primary 무응답 상한
// (chat-provider.ts) + 폴백 나머지. 세 값의 합은 이 총량을 넘지 않아야 한다.
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
  /** 캐시된 프로필 스냅샷 로더. 요청 안에서는 하나의 promise를 공유한다. */
  loadSnapshot?: (lang: Lang, source: ContentSource) => Promise<ProfileSnapshot>;
  /** live 캐시에서 항목을 찾지 못했을 때 사용할 최신 데이터 로더. */
  loadFreshData?: (source: ContentSource) => Promise<ChatProfileData>;
  buildContext?: (
    getSnapshot: () => Promise<ProfileSnapshot>,
    sections?: ProfileSection[],
    query?: RagQuery,
    signal?: AbortSignal,
  ) => Promise<string>;
  resolveReferences?: (
    requested: ChatReferenceRequest[],
    cachedReferences: ChatReference[],
    loadFreshReferences?: () => Promise<ChatReference[]>,
  ) => Promise<ChatReference[]>;
  rateLimiter?: ChatRateLimiter;
  intentClassifier?: ChatIntentClassifier;
  timeoutMs?: number;
};

/**
 * Accept-Language 헤더에서 기본 응답 언어를 고른다.
 *
 * @param {Request} request 채팅 HTTP 요청.
 * @returns {Lang} 영어로 시작하면 en, 그 밖에는 ko.
 */
const getHeaderLang = (request: Request): Lang => {
  const languages = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return languages.startsWith("en") ? "en" : "ko";
};

/**
 * 요청 본문의 언어를 읽고 유효하지 않으면 헤더 언어를 사용한다.
 *
 * @param {unknown} body 파싱된 요청 본문.
 * @param {Lang} fallback Accept-Language에서 고른 언어.
 * @returns {Lang} 응답과 오류 메시지에 사용할 언어.
 */
const getBodyLang = (body: unknown, fallback: Lang): Lang => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fallback;
  const lang = (body as Record<string, unknown>).lang;
  return lang === "ko" || lang === "en" ? lang : fallback;
};

/**
 * 공개 채팅 오류 응답을 만든다.
 *
 * @param {number} status HTTP 상태 코드.
 * @param {ChatErrorCode} code 공개 오류 코드.
 * @param {Lang} lang 오류 메시지 언어.
 * @param {HeadersInit | undefined} headers 추가 응답 헤더.
 * @returns {Response} JSON 오류 응답.
 */
const jsonError = (status: number, code: ChatErrorCode, lang: Lang, headers?: HeadersInit) =>
  Response.json({ error: { code, message: getChatErrorMessage(code, lang) } }, { status, headers });

/**
 * 모델이 반환한 href를 내부 상대 경로로 검증한다. `new URL()`이 dot segment를
 * 정규화하기 전에 raw pathname을 검사한다. 공개 pathname에는 percent encoding을
 * 허용하지 않으며 query 값에서만 허용한다.
 *
 * @param {string} href
 * @returns {{ pathname: string; searchParams: URLSearchParams } | null}
 */
const parseInternalHref = (
  href: string,
): { pathname: string; searchParams: URLSearchParams } | null => {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  const rawPath = href.split(/[?#]/)[0] ?? "";
  if (rawPath.includes("%")) return null;
  if (rawPath.split("/").some((segment) => segment === "." || segment === "..")) return null;

  let url: URL;
  try {
    url = new URL(href, "https://internal.invalid");
  } catch {
    return null;
  }
  if (url.username || url.password || url.host !== "internal.invalid") return null;
  // 내부 액션 링크에는 fragment를 사용하지 않는다.
  if (url.hash !== "") return null;
  // raw와 정규화 결과가 다르면 위장 입력이다.
  if (url.pathname !== rawPath) return null;
  return { pathname: url.pathname, searchParams: url.searchParams };
};

/** 사진 작업 경로에 하나 이상의 query가 있는지 확인한다. */
const isPhotoQueryRoute = (parsed: { pathname: string; searchParams: URLSearchParams }): boolean =>
  parsed.pathname === ROUTES.PHOTO && !parsed.searchParams.keys().next().done;

/**
 * 모델이 반환한 링크를 공개 내부 경로로 제한하고 사진 query를 canonical URL로 바꾼다.
 *
 * @param {ChatLink[] | undefined} links provider가 반환한 링크 후보.
 * @param {ChatReference[] | undefined} references 응답에 함께 표시할 참조 카드.
 * @param {PhotoFilterVocabulary | undefined} photoVocabulary 사진 query 검증용 공개 어휘.
 * @returns {ChatLink[] | undefined} 최대 두 개의 검증된 링크.
 */
const sanitizeLinks = (
  links: ChatLink[] | undefined,
  references: ChatReference[] | undefined,
  photoVocabulary?: PhotoFilterVocabulary,
): ChatLink[] | undefined => {
  const referencedSections = [
    ...new Set(references?.map(({ type }) => (type === "project" ? ROUTES.DEV : `/${type}`))),
  ];
  const safe = links
    ?.flatMap((link) => {
      if (!link.label.trim()) return [];
      const parsed = parseInternalHref(link.href);
      if (!parsed || !ALLOWED_ACTION_ROUTES.has(parsed.pathname)) return [];

      let href = link.href;
      if (isPhotoQueryRoute(parsed)) {
        // /photo 필터 query는 strict codec으로 검증 후 canonical로 재직렬화한다.
        // 공개 어휘를 읽지 못하면 query가 있는 사진 링크를 버린다.
        if (!photoVocabulary) return [];
        const strict = parsePhotoFilterQueryStrict(parsed.searchParams, photoVocabulary);
        if (!strict) return [];
        href = buildPhotoFilterHref(ROUTES.PHOTO, strict.state, {
          q: strict.q,
          photo: strict.photoId,
        });
      }

      if (
        referencedSections.some((section) => href === section || href.startsWith(`${section}/`))
      ) {
        return [];
      }
      // 참조 카드가 이미 가리키는 딥링크와 canonical href가 같으면 중복 노출이다.
      if (references?.some((reference) => reference.href === href)) return [];
      return [{ ...link, href }];
    })
    .slice(0, 2);
  return safe?.length ? safe : undefined;
};

/**
 * 내부 오류를 공개 HTTP 상태와 오류 코드로 바꾼다.
 *
 * @param {unknown} error 처리 중 발생한 오류.
 * @param {boolean} timedOut 요청 제한 시간을 넘겼는지 여부.
 * @returns {{ status: number; code: ChatErrorCode }} 클라이언트에 보낼 상태와 코드.
 */
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

/**
 * 채팅 요청을 검증하고 provider 응답을 JSON 또는 NDJSON 스트림으로 반환한다.
 *
 * @param {Request} request 채팅 HTTP 요청.
 * @param {ChatHandlerDependencies} dependencies provider와 테스트용 의존성.
 * @returns {Promise<Response>} 채팅 응답 또는 공개 오류 응답.
 */
const handleChatRequest = async (
  request: Request,
  {
    provider,
    loadSnapshot = loadProfileSnapshot,
    loadFreshData = (source) => getChatProfileData({ freshPublicFields: true, source }),
    buildContext = buildProfileContextFromSnapshot,
    resolveReferences = resolveReferencesWithRefresh,
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
      // 전역 일일 상한은 UTC 자정에 초기화된다.
      const code = rateLimit.scope === "daily" ? "DAILY_LIMIT" : "TOO_MANY_REQUESTS";
      return jsonError(429, code, responseLang, {
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

  // 프로필 문맥, 화면 문맥, 참조 카드는 요청 안에서 같은 lazy snapshot promise를 쓴다.
  const contentSource = getContentSource();
  let snapshotPromise: Promise<ProfileSnapshot> | undefined;
  const getSnapshot = () => (snapshotPromise ??= loadSnapshot(chatRequest.lang, contentSource));
  // 최신 데이터 재조회도 요청 안에서 하나의 promise를 공유한다.
  let freshDataPromise: Promise<ChatProfileData> | undefined;
  const getFreshData =
    contentSource === "live"
      ? () => (freshDataPromise ??= loadFreshData(contentSource))
      : undefined;

  const generateMessage = async (onContentDelta?: (delta: string) => void) => {
    const [profileContext, screenContext] = await Promise.all([
      shouldLoadProfile
        ? buildContext(getSnapshot, profileSections, ragQuery, controller.signal)
        : Promise.resolve(
            "# PROFILE_CONTEXT\nNo portfolio lookup was needed for this conversational turn.",
          ),
      // 화면 문맥 조회에 실패해도 답변은 계속하며 원문과 오류는 기록하지 않는다.
      resolveScreenContext(chatRequest.context?.openTarget, {
        getScreenLookup: async () => (await getSnapshot()).screenLookup,
        getFreshScreenLookup: getFreshData
          ? async () => buildScreenContextLookup(await getFreshData(), chatRequest.lang)
          : undefined,
      }).catch(() => undefined),
    ]);
    const result = await provider({
      instructions: buildChatInstructions(chatRequest.lang, profileContext, screenContext),
      messages: chatRequest.messages,
      lang: chatRequest.lang,
      signal: controller.signal,
      onContentDelta,
    });
    const content = result.content.trim();
    if (!content) throw new Error("Provider returned an empty response");
    // 참조 카드 조회가 실패하면 완성된 답변은 유지하고 카드만 생략한다.
    const references = result.references?.length
      ? await Promise.resolve()
          .then(async () =>
            resolveReferences(
              result.references ?? [],
              (await getSnapshot()).references,
              getFreshData
                ? async () => formatProfileReferences(await getFreshData(), chatRequest.lang)
                : undefined,
            ),
          )
          .catch((error: unknown) => {
            console.warn(
              "[chat] reference resolution failed; sending answer without references:",
              error,
            );
            return undefined;
          })
      : undefined;

    // 사진 query 링크가 있을 때만 어휘를 기다린다. 로드에 실패하면 해당 링크를 버린다.
    const hasPhotoQueryLink = result.links?.some((link) => {
      const parsed = parseInternalHref(link.href);
      return parsed ? isPhotoQueryRoute(parsed) : false;
    });
    const photoVocabulary = hasPhotoQueryLink
      ? await getSnapshot()
          .then((snapshot) => snapshot.linkVocabulary)
          .catch(() => undefined)
      : undefined;

    return {
      role: "assistant" as const,
      content,
      links: sanitizeLinks(result.links, references, photoVocabulary),
      references: references?.length ? references : undefined,
      // 스트리밍 응답의 contactDraft는 done 이벤트에만 포함한다.
      ...(result.contactDraft ? { contactDraft: result.contactDraft } : {}),
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
