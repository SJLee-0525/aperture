import { getMockReply } from "@/features/chat/_lib/mock-chat";
import { createGeminiChatProvider } from "@/features/chat/_lib/gemini-chat-provider";
import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";
import type { Lang } from "@/types/lang";
import type { ChatLink, ChatReferenceRequest } from "@/types/chat";

type ChatProviderInput = {
  instructions: string;
  messages: ChatRequestMessage[];
  lang: Lang;
  signal: AbortSignal;
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

const getChatProvider = (): ChatProvider => {
  if (process.env.CHAT_PROVIDER === "mock") return mockChatProvider;
  if (process.env.CHAT_PROVIDER === "gemini") {
    const apiKey = process.env.CHAT_PROVIDER_API_KEY?.trim();
    const model = process.env.CHAT_PROVIDER_MODEL?.trim();
    if (!apiKey || !model) return unavailableChatProvider;
    return createGeminiChatProvider(apiKey, model);
  }
  return unavailableChatProvider;
};

export { ChatProviderUnavailableError, getChatProvider };
export type { ChatProvider, ChatProviderResult };
