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
  type ProfileSection,
} from "@/features/chat/_lib/chat-intent";
import {
  ChatProviderUnavailableError,
  type ChatProvider,
} from "@/features/chat/_lib/chat-provider";
import {
  configuredDailyInputCharLimit,
  recordChatInputChars,
  type ChatRateLimiter,
} from "@/features/chat/_lib/chat-rate-limit";
import { createChatRequestDeadline } from "@/features/chat/_lib/chat-request-deadline";
import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import { enforceChatQuota } from "@/features/chat/_lib/enforce-chat-quota";
import { generateChatMessage } from "@/features/chat/_lib/generate-chat-message";
import { parseChatRequestBody } from "@/features/chat/_lib/parse-chat-request-body";
import { buildScreenContextLookup } from "@/features/chat/_lib/resolve-chat-screen-context";

import { getChatProfileData, type ChatProfileData } from "@/lib/content/chat";
import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import { fetchDevArticleById } from "@/lib/supabase/public/dev-articles";

import type { ChatIntentClassifier } from "@/features/chat/_lib/openai-intent-classifier";
import type { ScreenContextLookup } from "@/features/chat/_lib/resolve-chat-screen-context";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { DevArticle } from "@/types/dev-article";
import type { Lang } from "@/types/lang";
import type { RagExclude, RagPrioritize, RagQuery } from "@/types/rag";

// route.ts의 maxDuration(60초)보다 5초 먼저 요청을 끝낸다. Vercel이 함수를 먼저
// 종료하면 TIMEOUT 이벤트를 보낼 수 없다.
// 예산 배분: 인텐트 분류(CHAT_INTENT_TIMEOUT_MS) + primary 무응답 상한
// (chat-provider.ts) + 폴백 나머지. 세 값의 합은 이 총량을 넘지 않아야 한다.
const DEFAULT_TIMEOUT_MS = 55_000;

const STREAM_MEDIA_TYPE = "application/x-ndjson";

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

/** 공개 채팅 오류 응답. */
const jsonError = (status: number, code: ChatErrorCode, lang: Lang, headers?: HeadersInit) =>
  Response.json({ error: { code, message: getChatErrorMessage(code, lang) } }, { status, headers });

/**
 * 내부 오류를 공개 HTTP 상태와 오류 코드로 바꾼다.
 *
 * @param error 처리 중 발생한 오류.
 * @param timedOut 요청 제한 시간을 넘겼는지 여부.
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
    // 답변이 상한을 넘어 중단됐다. 질문을 나누면 답이 나오므로 알 수 없는 실패와 구분한다.
    if (error.kind === "too-long") return { status: 502, code: "RESPONSE_TOO_LONG" };
    // 상류가 우리 요청을 거절했다. 방문자가 다시 눌러도 같은 결과다.
    return { status: 502, code: "UPSTREAM_REQUEST_REJECTED" };
  }
  return { status: 502, code: "UPSTREAM_ERROR" };
};

/**
 * 채팅 요청을 검증하고 provider 응답을 JSON 또는 NDJSON 스트림으로 반환한다.
 *
 * 네 단계를 잇는다. 본문 파싱, 사용량 판정, 의도 분류, 답변 생성이다. 각 단계는 자기 모듈에
 * 있고 여기서는 순서와 실패 처리만 정한다.
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
  const parsed = await parseChatRequestBody(request);
  if (!parsed.ok) return jsonError(parsed.status, parsed.code, parsed.lang);

  const { request: chatRequest, lang: responseLang } = parsed;
  const quota = await enforceChatQuota(request, rateLimiter, inputCharLimit);
  if (!quota.ok) return jsonError(quota.status, quota.code, responseLang, quota.headers);
  const { contextBudgetSpent } = quota;

  const deadline = createChatRequestDeadline(request, timeoutMs);

  let chatIntent;
  try {
    chatIntent = await deadline.race(
      selectChatIntentWithClassifier(chatRequest.messages, deadline.signal, intentClassifier),
    );
  } catch (error) {
    deadline.cleanup();
    const { status, code } = publicErrorFor(error, deadline.timedOut());
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
    contentSource === "live" ? () => (freshDataPromise ??= loadFreshData(contentSource)) : undefined;
  // 섹션 게이트(verified)와 화면 문맥이 같은 조회 결과를 보도록 하나의 promise 를 공유한다.
  // 나뉘면 한쪽만 비공개를 반영해 누수가 반만 닫힌다.
  let freshLookupPromise: Promise<ScreenContextLookup> | undefined;
  const getFreshScreenLookup = getFreshData
    ? () =>
        (freshLookupPromise ??= getFreshData().then((data) =>
          buildScreenContextLookup(data, chatRequest.lang),
        ))
    : undefined;

  const run = (onContentDelta?: (delta: string) => void) =>
    deadline.race(
      generateChatMessage({
        lang: chatRequest.lang,
        messages: chatRequest.messages,
        context: chatRequest.context,
        intent: chatIntent,
        ragQuery,
        contextBudgetSpent,
        canUseOpenTarget,
        signal: deadline.signal,
        provider,
        getSnapshot,
        getFreshData,
        getFreshScreenLookup,
        // 열린 글 검증은 문서 한 건만 읽는다. mock 은 캐시된 스냅샷의 대조표를 쓴다.
        getArticle: contentSource === "live" ? loadArticle : undefined,
        buildContext,
        resolveReferences,
        formatFreshReferences: getFreshData ? formatProfileReferences : undefined,
        recordTokenUsage,
        onContentDelta,
      }),
    );

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
            const { status, code } = publicErrorFor(error, deadline.timedOut());
            send({
              type: "error",
              code,
              message: getChatErrorMessage(code, responseLang),
              retryable: status >= 500,
            });
          })
          .finally(() => {
            deadline.cleanup();
            if (!cancelled) streamController.close();
          });
      },
      cancel(reason) {
        cancelled = true;
        deadline.abort(reason);
        deadline.cleanup();
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
    const { status, code } = publicErrorFor(error, deadline.timedOut());
    return jsonError(status, code, responseLang);
  } finally {
    deadline.cleanup();
  }
};

export { handleChatRequest };
