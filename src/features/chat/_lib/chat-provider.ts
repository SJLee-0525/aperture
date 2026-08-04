import { getMockReply } from "@/features/chat/_lib/mock-chat";
import { createGeminiChatProvider } from "@/features/chat/_lib/gemini-chat-provider";
import { createOpenAIChatProvider } from "@/features/chat/_lib/openai-chat-provider";
import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";
import type { Lang } from "@/types/lang";
import type { ChatLink, ChatReferenceRequest } from "@/types/chat";

type ChatProviderInput = {
  instructions: string;
  messages: ChatRequestMessage[];
  lang: Lang;
  signal: AbortSignal;
  onContentDelta?: (delta: string) => void;
};

type ChatProviderResult = {
  content: string;
  links?: ChatLink[];
  references?: ChatReferenceRequest[];
};

type ChatProvider = (input: ChatProviderInput) => Promise<ChatProviderResult>;

class ChatProviderUnavailableError extends Error {
  constructor() {
    super("Chat provider is not configured");
    this.name = "ChatProviderUnavailableError";
  }
}

const unavailableChatProvider: ChatProvider = async () => {
  throw new ChatProviderUnavailableError();
};

const mockChatProvider: ChatProvider = async ({ messages, lang, signal }) => {
  if (signal.aborted) throw signal.reason;
  const question = messages.at(-1)?.content ?? "";
  const reply = getMockReply(question, lang);
  return {
    content: reply.content,
    links: reply.link ? [reply.link] : undefined,
    references: reply.references?.map(({ type, id }) => ({ type, id })),
  };
};

/**
 * primary가 무응답으로 매달리면 요청 전체 타임아웃(55초)을 혼자 소진해 폴백이
 * 시도조차 못 된다. 첫 본문 출력 전까지만 적용하는 상한 — 본문이 나가기 시작하면
 * 폴백하지 않으므로(emitted 가드) 건강한 스트림을 중간에 죽이지 않는다.
 * 비스트리밍 호출은 끝까지 이 상한을 받지만, 걸려도 폴백이 이어받으므로 응답은 나간다.
 * 최악 케이스 배분: 인텐트 분류 + 이 상한 + 폴백 나머지 — 전체 예산은 handle-chat-request.ts.
 * Gemini 실측(2026-08): 정상 TTFB ~1초, 간헐적으로 응답 시작 전 14~24초 큐잉 스파이크.
 */
const PRIMARY_NO_OUTPUT_TIMEOUT_MS = 25_000;

const withFallback =
  (primary: ChatProvider, fallback: ChatProvider): ChatProvider =>
  async (input) => {
    let emitted = false;
    // 무응답 타임아웃은 primary 전용 신호로만 중단한다 — 요청 전체(input.signal)를
    // 건드리면 폴백이 남은 시간 예산을 이어받을 수 없다.
    const attemptController = new AbortController();
    const noOutputTimer = setTimeout(() => {
      attemptController.abort(
        new DOMException("Primary chat provider produced no output in time", "TimeoutError"),
      );
    }, PRIMARY_NO_OUTPUT_TIMEOUT_MS);
    try {
      return await primary({
        ...input,
        signal: AbortSignal.any([input.signal, attemptController.signal]),
        onContentDelta: input.onContentDelta
          ? (delta) => {
              emitted = true;
              clearTimeout(noOutputTimer);
              input.onContentDelta?.(delta);
            }
          : undefined,
      });
    } catch (error) {
      if (input.signal.aborted || emitted) throw error;
      clearTimeout(noOutputTimer);
      console.warn("[chat-provider] primary provider failed; falling back:", error);
      return fallback(input);
    } finally {
      clearTimeout(noOutputTimer);
    }
  };

const configuredProvider = (
  provider: string | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): ChatProvider | undefined => {
  // env 값의 공백·대소문자 차이가 provider 매칭을 조용히 무산시키지 않도록 정규화한다.
  const normalizedProvider = provider?.trim().toLowerCase();
  const normalizedKey = apiKey?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedKey || !normalizedModel) return undefined;
  if (normalizedProvider === "gemini") {
    return createGeminiChatProvider(normalizedKey, normalizedModel);
  }
  if (normalizedProvider === "openai") {
    return createOpenAIChatProvider(normalizedKey, normalizedModel);
  }
  return undefined;
};

const getChatProvider = (): ChatProvider => {
  if (process.env.CHAT_PROVIDER?.trim().toLowerCase() === "mock") return mockChatProvider;
  const primary = configuredProvider(
    process.env.CHAT_PROVIDER,
    process.env.CHAT_PROVIDER_API_KEY,
    process.env.CHAT_PROVIDER_MODEL,
  );
  const fallback = configuredProvider(
    process.env.CHAT_FALLBACK_PROVIDER,
    process.env.CHAT_FALLBACK_PROVIDER_API_KEY,
    process.env.CHAT_FALLBACK_PROVIDER_MODEL,
  );
  if (!fallback && process.env.CHAT_FALLBACK_PROVIDER?.trim()) {
    console.warn(
      "[chat-provider] CHAT_FALLBACK_PROVIDER is set but the name is unknown or the key/model is missing; running without fallback",
    );
  }
  if (!primary) {
    if (!fallback) {
      console.warn(
        "[chat-provider] no chat provider is configured (primary and fallback both missing); chat is unavailable",
      );
      return unavailableChatProvider;
    }
    // 설정 누락은 배포 실수일 수 있어 조용히 가리지 않고 경고를 남긴 뒤 승격한다.
    console.warn(
      "[chat-provider] primary provider is not configured; promoting fallback to primary",
    );
    return fallback;
  }
  return fallback ? withFallback(primary, fallback) : primary;
};

export { ChatProviderUnavailableError, getChatProvider };
export type { ChatProvider, ChatProviderResult };
