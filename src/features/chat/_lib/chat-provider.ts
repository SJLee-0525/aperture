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

const withFallback =
  (primary: ChatProvider, fallback: ChatProvider): ChatProvider =>
  async (input) => {
    let emitted = false;
    try {
      return await primary({
        ...input,
        onContentDelta: input.onContentDelta
          ? (delta) => {
              emitted = true;
              input.onContentDelta?.(delta);
            }
          : undefined,
      });
    } catch (error) {
      if (input.signal.aborted || emitted) throw error;
      return fallback(input);
    }
  };

const configuredProvider = (
  provider: string | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): ChatProvider | undefined => {
  const normalizedKey = apiKey?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedKey || !normalizedModel) return undefined;
  if (provider === "gemini") return createGeminiChatProvider(normalizedKey, normalizedModel);
  if (provider === "openai") return createOpenAIChatProvider(normalizedKey, normalizedModel);
  return undefined;
};

const getChatProvider = (): ChatProvider => {
  if (process.env.CHAT_PROVIDER === "mock") return mockChatProvider;
  const primary = configuredProvider(
    process.env.CHAT_PROVIDER,
    process.env.CHAT_PROVIDER_API_KEY,
    process.env.CHAT_PROVIDER_MODEL,
  );
  if (!primary) return unavailableChatProvider;

  const fallback = configuredProvider(
    process.env.CHAT_FALLBACK_PROVIDER,
    process.env.CHAT_FALLBACK_PROVIDER_API_KEY,
    process.env.CHAT_FALLBACK_PROVIDER_MODEL,
  );
  return fallback ? withFallback(primary, fallback) : primary;
};

export { ChatProviderUnavailableError, getChatProvider };
export type { ChatProvider, ChatProviderResult };
