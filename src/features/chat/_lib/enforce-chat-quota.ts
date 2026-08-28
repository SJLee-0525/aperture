import { ChatRateLimitConfigurationError } from "@/features/chat/_lib/chat-rate-limit";

import type { ChatErrorCode } from "@/features/chat/_lib/chat-errors";
import type { ChatRateLimiter } from "@/features/chat/_lib/chat-rate-limit";

/**
 * 사용량 판정 결과.
 *
 * `contextBudgetSpent` 는 거절이 아니다. 하루 입력 문자 예산을 넘긴 요청은 화면 문맥과
 * 벡터 검색을 건너뛰고 답한다. 요청 수만 세면 비용이 잡히지 않아 두 상한을 함께 둔다.
 */
type ChatQuotaVerdict =
  | { ok: true; contextBudgetSpent: boolean }
  | { ok: false; status: number; code: ChatErrorCode; headers?: HeadersInit };

/**
 * IP 창과 전역 일일 상한, 하루 입력 문자 예산을 판정한다.
 *
 * 형식 검증을 통과한 요청만 여기 온다. 제한기가 창을 통과한 요청마다 전역 카운터를 올리므로,
 * 앞에 두면 잘못된 JSON 만으로도 그날의 전체 방문자 몫을 소진시킬 수 있다.
 *
 * @param inputCharLimit 하루 입력 문자 예산. 카운터가 없으면(공유 저장소 미설정) 판정하지 않는다.
 */
const enforceChatQuota = async (
  request: Request,
  rateLimiter: ChatRateLimiter | undefined,
  inputCharLimit: number,
): Promise<ChatQuotaVerdict> => {
  if (!rateLimiter) return { ok: true, contextBudgetSpent: false };

  let rateLimit;
  try {
    rateLimit = await rateLimiter(request);
  } catch (error) {
    if (error instanceof ChatRateLimitConfigurationError) {
      return {
        ok: false,
        status: 503,
        code: "RATE_LIMIT_UNAVAILABLE",
        headers: { "Retry-After": "60" },
      };
    }
    return { ok: false, status: 503, code: "RATE_LIMIT_UNAVAILABLE" };
  }

  if (!rateLimit.allowed) {
    // 전역 일일 상한은 UTC 자정에 초기화된다.
    return {
      ok: false,
      status: 429,
      code: rateLimit.scope === "daily" ? "DAILY_LIMIT" : "TOO_MANY_REQUESTS",
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    };
  }

  const contextBudgetSpent =
    rateLimit.dailyInputChars !== undefined && rateLimit.dailyInputChars > inputCharLimit;
  if (contextBudgetSpent) {
    console.warn(
      `[chat-input] 하루 입력 문자 예산 소진 (${rateLimit.dailyInputChars}/${inputCharLimit}) — 문맥 없이 답한다`,
    );
  }

  return { ok: true, contextBudgetSpent };
};

export { enforceChatQuota };
