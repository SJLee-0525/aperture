import { getChatProvider } from "@/features/chat/_lib/chat-provider";
import { chatRateLimiter } from "@/features/chat/_lib/chat-rate-limit";
import { handleChatRequest } from "@/features/chat/_lib/handle-chat-request";
import { getChatIntentClassifier } from "@/features/chat/_lib/openai-intent-classifier";

export const runtime = "nodejs";
export const maxDuration = 20;

export const POST = (request: Request) =>
  handleChatRequest(request, {
    provider: getChatProvider(),
    intentClassifier: getChatIntentClassifier(),
    rateLimiter: chatRateLimiter,
  });
