import { getChatProvider } from "@/features/chat/_lib/chat-provider";
import { chatRateLimiter } from "@/features/chat/_lib/chat-rate-limit";
import { handleChatRequest } from "@/features/chat/_lib/handle-chat-request";
import { getChatIntentClassifier } from "@/features/chat/_lib/openai-intent-classifier";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 공개 채팅 요청을 선택된 제공자와 공통 제한 정책으로 처리한다.
 * @param request 대화 내역과 언어를 담은 요청.
 * @returns NDJSON 스트림 또는 JSON 오류 응답.
 */
export const POST = (request: Request) =>
  handleChatRequest(request, {
    provider: getChatProvider(),
    intentClassifier: getChatIntentClassifier(),
    rateLimiter: chatRateLimiter,
  });
