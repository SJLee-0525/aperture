import { parseChatContext } from "@/features/chat/_lib/chat-context";

import type { ChatContext } from "@/features/chat/_lib/chat-context";
import type { ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import type { Lang } from "@/types/lang";

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

/** UTF-8 한 글자의 최대 바이트. 한국어는 3, 이모지는 서로게이트 쌍까지 4다. */
const MAX_UTF8_BYTES_PER_CHAR = 4;
/** role·lang·context 와 JSON 구두점이 차지하는 여유분. */
const ENVELOPE_BYTES = 4_000;

/**
 * 요청 본문 바이트 상한. 스키마가 허용하는 대화가 반드시 통과하도록 문자 상한에서 파생한다.
 *
 * 두 값을 따로 정하면 관계가 깨진다. 실제로 20,000 바이트 고정값이던 시절, 스키마가
 * 허용하는 한국어 8,000자 대화(약 24,000 바이트)가 파싱 전에 413 으로 거절됐고
 * 방문자 화면에는 메시지 수도 길이도 한도 안이라 회복할 단서가 없었다.
 */
const MAX_BODY_BYTES = CHAT_LIMITS.maxTotalChars * MAX_UTF8_BYTES_PER_CHAR + ENVELOPE_BYTES;

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

export { CHAT_LIMITS, ChatRequestError, MAX_BODY_BYTES, parseChatRequest };
export type { ChatRequestMessage };
