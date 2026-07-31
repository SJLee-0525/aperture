import { getChatProvider } from "@/features/chat/_lib/chat-provider";
import { chatRateLimiter } from "@/features/chat/_lib/chat-rate-limit";
import { handleChatRequest } from "@/features/chat/_lib/handle-chat-request";

export const runtime = "nodejs";

export const POST = (request: Request) =>
  handleChatRequest(request, { provider: getChatProvider(), rateLimiter: chatRateLimiter });
