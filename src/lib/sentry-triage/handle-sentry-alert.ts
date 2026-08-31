import { sendDiscordCard } from "@/lib/discord/send-webhook";
import { buildDiscordCard } from "@/lib/sentry-triage/discord-card";
import { normalizeSentryAlert } from "@/lib/sentry-triage/sentry-alert-payload";
import { getTriageProvider } from "@/lib/sentry-triage/triage-provider";
import { getTriageRateLimiter } from "@/lib/sentry-triage/triage-rate-limit";
import { claimSentryAlert, completeSentryAlert } from "@/lib/supabase/sentry-alerts";

import type { DiscordEmbed } from "@/lib/discord/types";
import type { TriageProvider } from "@/lib/triage/contract";
import type { SentryAlertSummary, TriageOutcome, TriageResult } from "@/types/sentry-alert";

/** LLM 전체 예산. 카드 전송과 기록 몫을 남긴다 (docs/plan/10 §4 시간 예산). */
const TRIAGE_BUDGET_MS = 35_000;

type ClaimResult =
  | { status: "claimed"; alertId: string }
  | { status: "duplicate" }
  | { status: "unconfigured" }
  | { status: "failed" };

type SentryAlertDependencies = {
  provider: TriageProvider<SentryAlertSummary, TriageResult>;
  rateLimiter: () => Promise<{ allowed: boolean; count: number }>;
  sendCard: (embed: DiscordEmbed) => Promise<{ ok: true } | { ok: false; error: string }>;
  claim: (summary: Parameters<typeof claimSentryAlert>[0]) => Promise<ClaimResult>;
  complete: (alertId: string, input: Parameters<typeof completeSentryAlert>[1]) => Promise<boolean>;
  now?: () => number;
};

/**
 * 판정을 시도한다. 실패를 예외로 올리지 않고 카드에 실을 사유로 바꾼다.
 * 상한을 넘으면 제공자를 부르지 않는다. 상한은 비용을 막는 장치이고 알림은 그대로 나간다.
 */
const runTriage = async (
  summary: Parameters<typeof claimSentryAlert>[0],
  deps: SentryAlertDependencies,
): Promise<TriageOutcome> => {
  // 제한기 호출만 따로 감싼다. 아래 try 에 넣으면 제한기 오류가 제공자 실패와 같은 값이 되어
  // 판정을 시도하지 못한 채 끝난다.
  let limit: { allowed: boolean; count: number };
  try {
    limit = await deps.rateLimiter();
  } catch (error) {
    console.warn("[sentry-alert] the daily counter failed; continuing without a cap:", error);
    limit = { allowed: true, count: 0 };
  }

  if (!limit.allowed) {
    return { status: "skipped", reason: `일일 상한 초과 (${limit.count}번째 호출)` };
  }

  const now = deps.now ?? Date.now;
  const started = now();
  try {
    const { result, provider, model } = await deps.provider(
      summary,
      AbortSignal.timeout(TRIAGE_BUDGET_MS),
    );
    return { status: "ok", result, provider, model, latencyMs: now() - started };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : "판정 실패" };
  }
};

/**
 * 서명 검증을 통과한 웹훅 본문 하나를 처리한다.
 *
 * 예외를 밖으로 던지지 않는다. 이 함수가 던지면 Sentry 가 그 오류를 잡고, 다시 알림이 오고,
 * 다시 이 경로가 호출된다. 실패는 전부 로그와 기록으로만 남긴다.
 *
 * 순서가 중요하다. 선점을 LLM 호출보다 먼저 해야 중복 전달이 제공자 호출까지 가지 않는다.
 *
 * @param raw `request.text()` 로 받은 본문 원문.
 * @param deps 제공자·제한기·전송기·저장소. 전부 주입해 테스트에서 외부 호출을 없앤다.
 */
const handleSentryAlert = async (raw: string, deps: SentryAlertDependencies): Promise<void> => {
  try {
    const summary = normalizeSentryAlert(raw);
    if (!summary) {
      console.error("[sentry-alert] could not read the webhook payload; dropping it");
      return;
    }

    const claim = await deps.claim(summary);
    if (claim.status === "duplicate") return;

    // 선점하지 못하면 같은 전달을 두 번 처리하는 것을 막을 수단이 없다. 그 구간에서는
    // 판정을 건너뛰어 재전송이 유료 호출로 이어지지 않게 하고, 카드만 보낸다.
    // `SENTRY_ALERT_LOG_SECRET` 이 없으면 이 상태가 상시가 되어 멱등 키 자체가 꺼진다.
    // 유효 서명이 붙은 본문을 확보한 쪽이 같은 요청을 반복하면 카드가 그 횟수만큼 나간다.
    const alertId = claim.status === "claimed" ? claim.alertId : null;
    const outcome: TriageOutcome = alertId
      ? await runTriage(summary, deps)
      : { status: "skipped", reason: "기록 선점 실패로 판정을 건너뜀" };
    if (outcome.status !== "ok") {
      console.warn(`[sentry-alert] sending an untriaged card: ${outcome.reason}`);
    }

    const sent = await deps.sendCard(buildDiscordCard(summary, outcome));
    if (!sent.ok) {
      console.error(`[sentry-alert] the card was not delivered: ${sent.error}`);
    }

    if (alertId) {
      await deps.complete(alertId, {
        outcome,
        notified: sent.ok,
        notifyError: sent.ok ? undefined : sent.error,
      });
    }
  } catch (error) {
    console.error("[sentry-alert] unexpected failure while handling the alert:", error);
  }
};

/**
 * env 로 실제 구현을 묶는다. 라우트는 이 값을 그대로 넘긴다.
 */
const sentryAlertDependencies = (): SentryAlertDependencies => ({
  provider: getTriageProvider(),
  rateLimiter: getTriageRateLimiter(),
  sendCard: (embed) => sendDiscordCard(process.env.DISCORD_ALERT_WEBHOOK_URL, embed),
  claim: claimSentryAlert,
  complete: completeSentryAlert,
});

export { handleSentryAlert, sentryAlertDependencies };
export type { SentryAlertDependencies };
