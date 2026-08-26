import {
  buildProfileContextFromSnapshot,
  formatProfileReferences,
  loadProfileSnapshot,
  resolveReferencesWithRefresh,
  type ProfileSnapshot,
} from "@/features/chat/_lib/build-profile-context";
import { getChatErrorMessage, type ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import {
  buildRagQueryText,
  isStandaloneNonLookupInput,
  selectChatIntentWithClassifier,
  type ChatIntent,
  type ProfileSection,
} from "@/features/chat/_lib/chat-intent";
import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";
import {
  ChatProviderUnavailableError,
  type ChatProvider,
} from "@/features/chat/_lib/chat-provider";
import {
  ChatRateLimitConfigurationError,
  configuredDailyInputCharLimit,
  recordChatInputChars,
  type ChatRateLimiter,
} from "@/features/chat/_lib/chat-rate-limit";
import { ChatRequestError, parseChatRequest } from "@/features/chat/_lib/chat-schema";
import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import {
  buildScreenContextLookup,
  entryOf,
  formatArticleScreenContextBlock,
  resolveScreenContext,
} from "@/features/chat/_lib/resolve-chat-screen-context";

import { matchDevArticleSlug, ROUTES } from "@/constants/routes";
import { getChatProfileData, type ChatProfileData } from "@/lib/content/chat";
import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import { readLimitedBody } from "@/lib/http/read-limited-body";
import { stripLangPrefix } from "@/lib/i18n/locale-path";
import {
  buildPhotoFilterHref,
  parsePhotoFilterQueryStrict,
  type PhotoFilterVocabulary,
} from "@/lib/photo-filter-query";
import { fetchDevArticleById } from "@/lib/supabase/public/dev-articles";

import type { ChatContext, ChatContextOpenTarget } from "@/features/chat/_lib/chat-context";
import type { ChatIntentClassifier } from "@/features/chat/_lib/openai-intent-classifier";
import type { ChatReference, ChatReferenceRequest, ChatReferenceType } from "@/types/chat";
import type { ChatLink } from "@/types/chat";
import type { DevArticle } from "@/types/dev-article";
import type { Lang } from "@/types/lang";
import type { RagExclude, RagPrioritize, RagQuery } from "@/types/rag";

// route.ts의 maxDuration(60초)보다 5초 먼저 요청을 끝낸다. Vercel이 함수를 먼저
// 종료하면 TIMEOUT 이벤트를 보낼 수 없다.
// 예산 배분: 인텐트 분류(CHAT_INTENT_TIMEOUT_MS) + primary 무응답 상한
// (chat-provider.ts) + 폴백 나머지. 세 값의 합은 이 총량을 넘지 않아야 한다.
const DEFAULT_TIMEOUT_MS = 55_000;
const MAX_BODY_BYTES = 20_000;

/**
 * 교차 출처에서 온 요청인지 본다.
 *
 * 응답에 CORS 헤더가 없어 공격자 페이지는 답변을 읽지 못하지만, `Content-Type` 을 보지 않으면
 * `text/plain` simple request 로 preflight 없이 본문이 실행된다. 인텐트 분류와 임베딩, LLM
 * 호출까지 발생한 뒤에야 rate limit 이 걸리고, 방문자마다 자기 IP 로 보내므로 IP 창이
 * 방문자 수만큼 곱해진다. `application/json` 을 강제하면 preflight 가 필수가 되어 이 경로가 닫힌다.
 *
 * `Sec-Fetch-Site` 는 있을 때만 본다. 구형 브라우저와 일부 프록시는 이 헤더를 보내지 않아,
 * 부재를 차단으로 처리하면 정상 방문자가 챗을 쓰지 못한다.
 */
const isSameOriginRequest = (request: Request): boolean => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
};
const STREAM_MEDIA_TYPE = "application/x-ndjson";
const ALLOWED_ACTION_ROUTES = new Set<string>([
  ROUTES.CONTACT,
  ROUTES.DEV,
  ROUTES.DEV_ARTICLES,
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

/** 열린 상세 항목이 속한 프로필 섹션. */
const TARGET_PROFILE_SECTIONS: Record<ChatContextOpenTarget["type"], ProfileSection> = {
  photo: "photography",
  work: "music",
  award: "music",
  project: "development",
  article: "development",
};

/**
 * 화면 target 해석 결과. 프로필 섹션 선택, 화면 문맥, RAG 우선 검색이 같은 값을 쓴다.
 * `verified` 만이 공개 데이터에서 항목을 실제로 찾았다는 뜻이며, 조회를 유발하는 섹션 선택은
 * 이 플래그로만 열린다.
 */
type ResolvedChatTarget = {
  openTarget?: ChatContextOpenTarget;
  /** 공개 데이터에서 이 target 을 찾았는지 여부. */
  verified?: boolean;
  prioritize?: { sourceType: string; sourceId: string };
  /** 본문 전문이 화면 문맥에 실린 원본 — RAG 후보에서 빼 프롬프트 중복을 막는다. */
  exclude?: RagExclude;
  /** 검증에 읽은 문서로 만든 화면 문맥. 있으면 추가 조회 없이 그대로 쓴다. */
  screenContext?: string;
};

type ChatHandlerDependencies = {
  provider: ChatProvider;
  /** 캐시된 프로필 스냅샷 로더. 요청 안에서는 하나의 promise를 공유한다. */
  loadSnapshot?: (lang: Lang, source: ContentSource) => Promise<ProfileSnapshot>;
  /** live 캐시에서 항목을 찾지 못했을 때 사용할 최신 데이터 로더. */
  loadFreshData?: (source: ContentSource) => Promise<ChatProfileData>;
  /** 열린 글을 검증할 live 단건 로더. 목록 전체를 읽지 않는다. */
  loadArticle?: (id: string, signal?: AbortSignal) => Promise<DevArticle | null>;
  buildContext?: (
    getSnapshot: () => Promise<ProfileSnapshot>,
    sections?: ProfileSection[],
    query?: RagQuery,
    signal?: AbortSignal,
    prioritize?: RagPrioritize,
    exclude?: RagExclude,
  ) => Promise<string>;
  resolveReferences?: (
    requested: ChatReferenceRequest[],
    cachedReferences: ChatReference[],
    loadFreshReferences?: () => Promise<ChatReference[]>,
  ) => Promise<ChatReference[]>;
  rateLimiter?: ChatRateLimiter;
  intentClassifier?: ChatIntentClassifier;
  timeoutMs?: number;
  /** 이번 요청의 입력 문자 수를 하루 예산에 더한다. 실패해도 요청을 막지 않는다. */
  recordTokenUsage?: (chars: number) => Promise<void>;
  /** 하루 입력 문자 예산. 넘기면 문맥 없이 답한다. */
  inputCharLimit?: number;
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
 * 요청 화면 문맥을 해석해 세 소비처(섹션 선택·화면 문맥·RAG 우선 검색)가 함께 쓸 값으로 만든다.
 *
 * 글은 URL 의 slug 와 문서 ID 가 따로 오므로 서버가 문서 한 건을 읽어 두 값을 맞춰 본다.
 * live 에서는 캐시된 스냅샷으로 물러나지 않는다. 방금 발행을 취소한 글이 캐시에 남아 있으면
 * 되살아나기 때문이다. 조회 자체가 실패하면 글 target 과 우선 검색을 함께 버리고
 * 채팅은 그대로 이어 간다(글은 fail-closed, 채팅은 fail-open).
 * 검증에 읽은 문서로 화면 문맥까지 만들어 돌려준다. 같은 글을 두 번 읽지 않는다.
 *
 * 나머지 종류는 캐시된 스냅샷의 화면 문맥 lookup 에 그 id 가 있는지로 확인한다.
 * 스냅샷에 없어도 target 을 버리지는 않는다. 방금 공개한 항목이 캐시에 아직 없을 수 있고
 * `resolveScreenContext` 의 최신 조회가 그 경우를 처리한다. 확인되지 않은 target 은
 * `verified` 가 거짓이라 프로필 섹션을 열지 못한다.
 *
 * @param {ChatContext | undefined} context 파싱을 마친 요청 문맥.
 * @param {Lang} lang 화면 문맥을 표시할 언어.
 * @param {((id: string, signal?: AbortSignal) => Promise<DevArticle | null>) | undefined} loadArticle live 단건 로더. mock 이면 undefined.
 * @param {() => Promise<ProfileSnapshot>} getSnapshot 캐시된 스냅샷 로더.
 * @param {AbortSignal} signal 요청 취소 신호.
 * @returns {Promise<ResolvedChatTarget>} 해석한 target, 확인 여부, 우선 검색 대상, 화면 문맥.
 */
const resolveContextTarget = async (
  context: ChatContext | undefined,
  lang: Lang,
  loadArticle: ((id: string, signal?: AbortSignal) => Promise<DevArticle | null>) | undefined,
  getSnapshot: () => Promise<ProfileSnapshot>,
  signal: AbortSignal,
): Promise<ResolvedChatTarget> => {
  const openTarget = context?.openTarget;
  if (!openTarget) return {};

  if (openTarget.type !== "article") {
    try {
      return {
        openTarget,
        verified: entryOf((await getSnapshot()).screenLookup, openTarget) !== undefined,
      };
    } catch {
      // 스냅샷을 읽지 못하면 이 항목이 공개인지 확인할 수 없다. 조회를 열지 않고 답변은 이어 간다.
      return { openTarget };
    }
  }

  const slug = matchDevArticleSlug(stripLangPrefix(context.pathname));
  if (!slug) return {};
  const resolved: ResolvedChatTarget = {
    openTarget,
    verified: true,
    prioritize: { sourceType: "article", sourceId: openTarget.id },
  };

  try {
    if (!loadArticle) {
      return (await getSnapshot()).articleSlugById[openTarget.id] === slug ? resolved : {};
    }
    const article = await loadArticle(openTarget.id, signal);
    // RLS 가 초안 read 를 거부하므로 여기 도달한 문서도 published 를 다시 확인한다.
    if (!article || !article.published || article.slug !== slug) return {};
    // 열어 둔 글은 본문 평문까지 문맥에 싣는다. 검증에 읽은 문서를 재사용한다.
    const block = formatArticleScreenContextBlock(article, lang);
    if (block.complete) {
      // 본문 전문이 문맥에 있으면 같은 글 청크는 중복이다. 우선 검색 대신 후보에서 뺀다.
      return {
        openTarget,
        verified: true,
        exclude: { sourceType: "article", sourceId: openTarget.id },
        screenContext: block.text,
      };
    }
    // 잘린 본문은 꼬리를 청크가 보완하도록 우선 검색을 유지한다.
    return { ...resolved, screenContext: block.text };
  } catch {
    // 조회가 막히면 이 글이 아직 공개인지 확인할 수 없다. 문맥 없이 답한다.
    return {};
  }
};

/**
 * 참조 카드 종류별로 카드가 대신하는 목록 경로.
 * 개발은 `/dev`(소개)가 아니라 각 목록을 가린다. 소개까지 넣으면 카드가 붙은 답변에서
 * 소개 링크가 함께 사라진다.
 */
const REFERENCE_SECTION_ROUTES: Record<ChatReferenceType, string> = {
  article: ROUTES.DEV_ARTICLES,
  music: ROUTES.MUSIC,
  photo: ROUTES.PHOTO,
  project: ROUTES.DEV_PROJECTS,
};

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
  // 참조 카드가 이미 대신하는 목록 경로는 링크에서 뺀다.
  const referencedSections = [
    ...new Set(references?.map(({ type }) => REFERENCE_SECTION_ROUTES[type])),
  ];
  const safe = links
    ?.flatMap((link) => {
      if (!link.label.trim()) return [];
      const parsed = parseInternalHref(link.href);
      if (!parsed || !ALLOWED_ACTION_ROUTES.has(parsed.pathname)) return [];

      let href = link.href;
      // 사진 밖 경로는 query 를 그대로 둔다. pathname 이 이미 허용목록에 갇혀 있고 링크는
      // 내부 페이지로만 가므로, 남는 영향은 그 페이지가 조작된 상태로 열리는 정도다.
      // strict codec 은 사진 필터 어휘에만 있어 다른 경로에는 검증 기준 자체가 없다.
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
    loadArticle = (id, signal) => fetchDevArticleById(id, { fresh: true, signal }),
    buildContext = buildProfileContextFromSnapshot,
    resolveReferences = resolveReferencesWithRefresh,
    rateLimiter,
    intentClassifier,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    recordTokenUsage = recordChatInputChars,
    inputCharLimit = configuredDailyInputCharLimit(),
  }: ChatHandlerDependencies,
): Promise<Response> => {
  let responseLang = getHeaderLang(request);
  if (!isSameOriginRequest(request)) {
    return jsonError(400, "INVALID_REQUEST_SOURCE", responseLang);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError(400, "REQUEST_TOO_LARGE", responseLang);
  }

  // 본문은 상한까지만 읽는다. 제한에 걸린 요청이 메모리를 쓰는 양은 이 절단이 정한다.
  let rawBody: string | null;
  try {
    rawBody = await readLimitedBody(request, MAX_BODY_BYTES);
  } catch {
    return jsonError(400, "REQUEST_READ_FAILED", responseLang);
  }
  if (rawBody === null) {
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

  // 사용량 판정은 형식 검증 뒤에 둔다. 제한기가 IP 창을 통과한 요청마다 전역 일일 카운터를
  // 올리므로, 앞에 두면 잘못된 JSON 만으로도 그날의 전체 방문자 몫을 소진시킬 수 있다.
  /** 하루 입력 문자 예산을 넘긴 상태. 문맥 조회와 벡터 검색을 모두 건너뛴다. */
  let contextBudgetSpent = false;
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
    // 카운터가 없으면(공유 저장소 미설정) 판정하지 않는다.
    if (rateLimit.dailyInputChars !== undefined && rateLimit.dailyInputChars > inputCharLimit) {
      contextBudgetSpent = true;
      console.warn(
        `[chat-input] 하루 입력 문자 예산 소진 (${rateLimit.dailyInputChars}/${inputCharLimit}) — 문맥 없이 답한다`,
      );
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
  // "이 글 요약해 줘" 처럼 분야 단어가 없는 지시어 질문은 정규식 분류가 비워 두고 내려보낸다.
  // 열어 둔 항목이 있으면 그 섹션으로 조회한다. 인사말은 여기서 제외한다.
  // 상세 화면에서 인사만 해도 매번 벡터 검색이 돌면 비용이 는다.
  const canUseOpenTarget =
    chatIntent.sections.length === 0 && !isStandaloneNonLookupInput(chatRequest.messages);
  // 스트림 상태 이벤트는 target 검증 전에 나가야 해서 조회 가능성만 본다.
  // 예산을 넘긴 요청은 아무것도 조회하지 않으므로 "검색 중" 을 보여 주면 안 된다.
  const mayLoadProfile =
    !contextBudgetSpent &&
    (chatIntent.sections.length > 0 ||
      Boolean(canUseOpenTarget && chatRequest.context?.openTarget));
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
  // 열린 글 검증은 문서 한 건만 읽는다. mock 은 캐시된 스냅샷의 대조표를 쓴다.
  const getArticle = contentSource === "live" ? loadArticle : undefined;

  const generateMessage = async (onContentDelta?: (delta: string) => void) => {
    // 해석은 섹션 선택, 화면 문맥, RAG 우선 검색 앞의 공통 단계다. 세 곳이 각자 판단하면
    // 확인되지 않은 target 이 한쪽으로 샌다.
    // 입력 예산을 넘겼으면 해석 자체를 건너뛴다. 문서 조회와 벡터 검색이 모두 빠진다.
    const resolved: ResolvedChatTarget = contextBudgetSpent
      ? {}
      : await resolveContextTarget(
          chatRequest.context,
          chatRequest.lang,
          getArticle,
          getSnapshot,
          controller.signal,
        );
    // 공개 데이터에서 찾은 target 만 섹션을 연다. 없는 id 로 조회를 유발할 수 없다.
    const openTargetSection =
      canUseOpenTarget && resolved.verified && resolved.openTarget
        ? TARGET_PROFILE_SECTIONS[resolved.openTarget.type]
        : null;
    // `profile` 은 섹션이 하나라도 잡히면 늘 함께 본다(`chat-intent` 의 `sectionsForText` 규약).
    const profileSections: ProfileSection[] = contextBudgetSpent
      ? []
      : openTargetSection
        ? ["profile", openTargetSection]
        : chatIntent.sections;
    // 질문이 스스로 섹션을 고른 경우에는 열어 둔 원본도 최소 점수를 넘어야 자리를 차지한다.
    const prioritize: RagPrioritize | undefined = resolved.prioritize
      ? { ...resolved.prioritize, ignoreScoreFloor: openTargetSection !== null }
      : undefined;

    const [profileContext, screenContext] = await Promise.all([
      profileSections.length > 0
        ? buildContext(
            getSnapshot,
            profileSections,
            ragQuery,
            controller.signal,
            prioritize,
            resolved.exclude,
          )
        : Promise.resolve(
            "# PROFILE_CONTEXT\nNo portfolio lookup was needed for this conversational turn.",
          ),
      // 화면 문맥 조회에 실패해도 답변은 계속하며 원문과 오류는 기록하지 않는다.
      resolved.screenContext !== undefined
        ? Promise.resolve(resolved.screenContext)
        : resolveScreenContext(resolved.openTarget, {
            getScreenLookup: async () => (await getSnapshot()).screenLookup,
            getFreshScreenLookup: getFreshData
              ? async () => buildScreenContextLookup(await getFreshData(), chatRequest.lang)
              : undefined,
          }).catch(() => undefined),
    ]);
    const instructions = buildChatInstructions(chatRequest.lang, profileContext, screenContext);
    const messageChars = chatRequest.messages.reduce(
      (total, { content }) => total + content.length,
      0,
    );
    // 프롬프트 크기 계측 — 화면 본문·RAG 청크 예산 조정의 기준선 (checklist 08 M6 후속).
    console.info(
      `[chat-input] instructions=${instructions.length} profile=${profileContext.length} screen=${screenContext?.length ?? 0} messages=${messageChars}`,
    );
    // 입력 비용은 호출 시점에 확정되므로 응답을 기다리지 않고 먼저 적는다. 성공 후에 적으면
    // 타임아웃된 요청의 입력이 예산에서 빠진다. 기본 구현은 실패를 안에서 처리하지만,
    // 주입된 구현까지 그렇다는 보장이 없어 여기서도 받아 둔다.
    void recordTokenUsage(instructions.length + messageChars).catch(() => undefined);
    const result = await provider({
      instructions,
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

        if (mayLoadProfile) send({ type: "status", status: "portfolio-search" });

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
