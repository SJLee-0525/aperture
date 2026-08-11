import { parseChatContext } from "@/features/chat/_lib/chat-context";

import type { Lang } from "@/types/lang";
import type { ChatContext } from "@/features/chat/_lib/chat-context";
import type { ChatErrorCode } from "@/features/chat/_lib/chat-errors";

type ChatRequestRole = "assistant" | "user";

type ChatRequestMessage = {
  role: ChatRequestRole;
  content: string;
};

type ChatRequest = {
  messages: ChatRequestMessage[];
  lang: Lang;
  context?: ChatContext;
};

const CHAT_LIMITS = {
  maxMessages: 12,
  maxMessageChars: 2_000,
  maxTotalChars: 8_000,
} as const;

class ChatRequestError extends Error {
  readonly code: ChatErrorCode;

  constructor(code: ChatErrorCode) {
    super(code);
    this.name = "ChatRequestError";
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseChatRequest = (value: unknown): ChatRequest => {
  if (!isRecord(value)) throw new ChatRequestError("INVALID_BODY");
  if (value.lang !== "ko" && value.lang !== "en") {
    throw new ChatRequestError("UNSUPPORTED_LANGUAGE");
  }
  if (!Array.isArray(value.messages) || value.messages.length === 0) {
    throw new ChatRequestError("MESSAGES_REQUIRED");
  }
  if (value.messages.length > CHAT_LIMITS.maxMessages) {
    throw new ChatRequestError("TOO_MANY_MESSAGES");
  }

  let totalChars = 0;
  const messages = value.messages.map((message): ChatRequestMessage => {
    if (!isRecord(message) || (message.role !== "user" && message.role !== "assistant")) {
      throw new ChatRequestError("INVALID_ROLE");
    }
    if (typeof message.content !== "string") {
      throw new ChatRequestError("INVALID_CONTENT");
    }

    const content = message.content.trim();
    if (!content) throw new ChatRequestError("EMPTY_MESSAGE");
    if (content.length > CHAT_LIMITS.maxMessageChars) {
      throw new ChatRequestError("MESSAGE_TOO_LONG");
    }
    totalChars += content.length;
    return { role: message.role, content };
  });

  if (totalChars > CHAT_LIMITS.maxTotalChars) {
    throw new ChatRequestError("CONVERSATION_TOO_LONG");
  }
  if (messages.at(-1)?.role !== "user") {
    throw new ChatRequestError("LAST_MESSAGE_MUST_BE_USER");
  }

  // 잘못된 화면 문맥은 버리고 채팅 요청은 계속 처리한다.
  const context = parseChatContext(value.context);
  return context ? { messages, lang: value.lang, context } : { messages, lang: value.lang };
};

export { CHAT_LIMITS, ChatRequestError, parseChatRequest };
export type { ChatRequestMessage };
