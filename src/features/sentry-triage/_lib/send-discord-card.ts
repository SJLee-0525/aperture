import type { DiscordEmbed } from "@/features/sentry-triage/_lib/discord-card";

type SendResult = { ok: true } | { ok: false; error: string };

type SendOptions = {
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /**
   * 이 전송에 쓸 수 있는 전체 시간. 요청과 429 대기가 모두 이 예산을 나눠 쓴다.
   * 함수 실행 상한(maxDuration 60초) 안에서 기록 RPC 까지 끝나야 하기 때문이다.
   */
  budgetMs?: number;
};

const DEFAULT_BUDGET_MS = 10_000;
const SERVER_ERROR_RETRY_MS = 1_000;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 429 응답의 대기 시간을 읽는다. Discord 는 초 단위 실수로 준다.
 * 본문이 없거나 형식이 다르면 재시도 판단을 포기하도록 null 을 돌려준다.
 */
const retryAfterMs = async (response: Response): Promise<number | null> => {
  const body = (await response.json().catch(() => null)) as { retry_after?: unknown } | null;
  const seconds = body?.retry_after;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;
  return Math.ceil(seconds * 1_000);
};

/**
 * 카드 한 장을 Discord 채널 웹훅으로 보낸다. 재시도는 최대 1회다.
 *
 * 실패를 예외로 올리지 않는다. 호출자는 전송 실패를 기록하고 나머지 흐름을 이어가야 하며,
 * 알림 실패가 판정 기록까지 잃게 만들어서는 안 된다.
 *
 * @param webhookUrl 채널 웹훅 주소. 비어 있으면 설정 오류로 처리한다.
 * @param embed 보낼 카드.
 * @returns 성공 여부와 실패 사유.
 */
const sendDiscordCard = async (
  webhookUrl: string | undefined,
  embed: DiscordEmbed,
  options: SendOptions = {},
): Promise<SendResult> => {
  const url = webhookUrl?.trim();
  if (!url) return { ok: false, error: "DISCORD_ALERT_WEBHOOK_URL is not configured" };

  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;

  // 요청마다 개별 상한을 두면 최악 경로가 요청 + 429 대기 + 요청이 되어 예산을 넘는다.
  // 데드라인 하나를 두고 각 요청에 남은 시간만 준다.
  const deadline = now() + budgetMs;
  const remaining = () => deadline - now();

  // 대기가 예상보다 길어져 남은 시간이 0 이하가 되면 AbortSignal.timeout 이 거부한다.
  const post = (timeoutMs: number) =>
    fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
    });

  let response: Response;
  try {
    response = await post(remaining());
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "request failed" };
  }

  if (response.ok) return { ok: true };

  if (response.status === 429) {
    const waitMs = await retryAfterMs(response);
    if (waitMs === null) return { ok: false, error: "429 without a usable retry_after" };
    if (waitMs >= remaining()) {
      return { ok: false, error: `429 retry_after ${waitMs}ms exceeds the remaining budget` };
    }
    await sleep(waitMs);
  } else if (response.status >= 500) {
    if (SERVER_ERROR_RETRY_MS >= remaining()) {
      return { ok: false, error: `Discord returned ${response.status} and the budget is spent` };
    }
    await sleep(SERVER_ERROR_RETRY_MS);
  } else {
    // 400·401·404 는 카드 구성이나 웹훅 주소 문제라 같은 요청을 다시 보내도 같은 답이 온다.
    return { ok: false, error: `Discord rejected the card (${response.status})` };
  }

  try {
    const retried = await post(remaining());
    return retried.ok
      ? { ok: true }
      : { ok: false, error: `Discord retry failed (${retried.status})` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "retry failed" };
  }
};

export { sendDiscordCard };
