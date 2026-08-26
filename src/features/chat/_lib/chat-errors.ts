import type { Lang } from "@/types/lang";

const CHAT_ERROR_MESSAGES = {
  ko: {
    INVALID_BODY: "요청 본문이 올바르지 않습니다.",
    UNSUPPORTED_LANGUAGE: "지원하지 않는 언어입니다.",
    MESSAGES_REQUIRED: "메시지가 필요합니다.",
    TOO_MANY_MESSAGES: "대화가 너무 깁니다.",
    INVALID_ROLE: "허용되지 않은 메시지 역할입니다.",
    INVALID_CONTENT: "메시지 내용이 올바르지 않습니다.",
    EMPTY_MESSAGE: "빈 메시지는 보낼 수 없습니다.",
    MESSAGE_TOO_LONG: "메시지가 너무 깁니다.",
    CONVERSATION_TOO_LONG: "전체 대화가 너무 깁니다.",
    LAST_MESSAGE_MUST_BE_USER: "마지막 메시지는 사용자 질문이어야 합니다.",
    REQUEST_TOO_LARGE: "요청이 너무 큽니다.",
    INVALID_REQUEST_SOURCE: "이 요청은 처리할 수 없습니다.",
    REQUEST_READ_FAILED: "요청 본문을 읽을 수 없습니다.",
    INVALID_JSON: "JSON 요청 본문이 올바르지 않습니다.",
    PROVIDER_UNAVAILABLE: "챗봇이 아직 준비되지 않았습니다.",
    RATE_LIMIT: "사용량이 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.",
    TOO_MANY_REQUESTS: "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.",
    DAILY_LIMIT: "오늘의 대화 한도를 모두 사용했습니다. 내일 다시 찾아와 주세요.",
    RATE_LIMIT_UNAVAILABLE: "요청 보호 서비스를 확인하고 있습니다. 잠시 후 다시 시도해 주세요.",
    CONTENT_BLOCKED: "이 요청에는 답변할 수 없습니다. 다른 방식으로 질문해 주세요.",
    UPSTREAM_ERROR: "답변을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    TIMEOUT: "답변 시간이 초과되었습니다. 다시 시도해 주세요.",
  },
  en: {
    INVALID_BODY: "The request body is invalid.",
    UNSUPPORTED_LANGUAGE: "This language is not supported.",
    MESSAGES_REQUIRED: "At least one message is required.",
    TOO_MANY_MESSAGES: "The conversation is too long.",
    INVALID_ROLE: "The message role is not allowed.",
    INVALID_CONTENT: "The message content is invalid.",
    EMPTY_MESSAGE: "Messages cannot be empty.",
    MESSAGE_TOO_LONG: "The message is too long.",
    CONVERSATION_TOO_LONG: "The conversation is too long.",
    LAST_MESSAGE_MUST_BE_USER: "The last message must be from the user.",
    REQUEST_TOO_LARGE: "The request is too large.",
    INVALID_REQUEST_SOURCE: "This request cannot be processed.",
    REQUEST_READ_FAILED: "The request body could not be read.",
    INVALID_JSON: "The JSON request body is invalid.",
    PROVIDER_UNAVAILABLE: "The chatbot is not available yet.",
    RATE_LIMIT: "Usage is temporarily limited. Please try again shortly.",
    TOO_MANY_REQUESTS: "Too many requests. Please try again shortly.",
    DAILY_LIMIT: "Today's conversation limit has been reached. Please come back tomorrow.",
    RATE_LIMIT_UNAVAILABLE:
      "The request protection service is being checked. Please try again shortly.",
    CONTENT_BLOCKED: "This request cannot be answered. Please try asking another way.",
    UPSTREAM_ERROR: "A response could not be generated. Please try again shortly.",
    TIMEOUT: "The response timed out. Please try again.",
  },
} as const;

type ChatErrorCode = keyof (typeof CHAT_ERROR_MESSAGES)["ko"];

const getChatErrorMessage = (code: ChatErrorCode, lang: Lang) => CHAT_ERROR_MESSAGES[lang][code];

export { getChatErrorMessage };
export type { ChatErrorCode };
