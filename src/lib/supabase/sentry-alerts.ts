import "server-only";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

import type { SentryAlertSummary, TriageOutcome } from "@/types/sentry-alert";

/**
 * Sentry 트리아지 기록 transport. 라우트 핸들러만 사용하는 서버 전용 모듈이다.
 *
 * RLS 가 아니라 공유 시크릿을 검증하는 `security definer` RPC 두 개가 쓰기 경계다
 * (ADR-0006). publishable key 는 `apikey` 헤더로만 보내고 `Authorization` 은 쓰지 않는다.
 */
const RPC_TIMEOUT_MS = 5_000;

type ClaimOutcome =
  | { status: "claimed"; alertId: string }
  | { status: "duplicate" }
  | { status: "unconfigured" }
  | { status: "failed" };

type CompleteInput = {
  outcome: TriageOutcome;
  notified: boolean;
  notifyError?: string;
};

const rpcUrl = (name: string) => `${supabaseUrl()}/rest/v1/rpc/${name}`;

const headers = (): Record<string, string> => ({
  apikey: supabasePublishableKey(),
  "Content-Type": "application/json",
});

/**
 * 업스트림 원문은 서버 로그에만 남긴다. 응답에 실으면 컬럼·정책명 같은 내부 정보가
 * 관리자 화면 밖까지 나간다 (`rag.ts` 와 같은 규약).
 */
const logUpstreamError = async (label: string, response: Response) => {
  const body = await response.text().catch(() => "");
  console.error(`[sentry-alerts] ${label} ${response.status}: ${body.slice(0, 500)}`);
};

const callRpc = async (name: string, body: unknown): Promise<Response | null> => {
  try {
    return await fetch(rpcUrl(name), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[sentry-alerts] ${name} request failed:`, error);
    return null;
  }
};

/**
 * 선점 RPC 의 응답 본문을 읽는다.
 *
 * PostgREST 는 중복일 때 정확히 JSON `null` 을 돌려준다. 본문이 비었거나 JSON 이 아닌 것은
 * 프록시·게이트웨이 이상이므로 중복과 구분한다. 둘을 합치면 그 응답을 받은 알림이
 * 카드도 로그도 없이 사라진다.
 *
 * @param body 응답 본문 원문. 읽기에 실패했으면 null.
 */
const readClaimBody = (body: string | null): ClaimOutcome => {
  if (body === null) {
    console.error("[sentry-alerts] claim response body could not be read");
    return { status: "failed" };
  }

  const trimmed = body.trim();
  if (trimmed === "null") return { status: "duplicate" };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string" && parsed) return { status: "claimed", alertId: parsed };
  } catch {
    // 아래 로그로 넘어간다.
  }

  console.error(`[sentry-alerts] unexpected claim response: ${trimmed.slice(0, 200)}`);
  return { status: "failed" };
};

/**
 * 웹훅 전달 하나를 선점한다. LLM 을 부르기 전에 호출한다.
 *
 * 반환값을 네 가지로 나누는 이유는 호출자의 대응이 다르기 때문이다.
 * `duplicate` 는 정상 중복이라 조용히 끝내고, `unconfigured` 는 배포 설정 오류이며,
 * `failed` 는 런타임 장애다. 뒤의 둘은 기록을 포기하고 카드는 그대로 보낸다.
 *
 * @param summary 정규화를 마친 이벤트 요약.
 * @returns 선점 결과. `claimed` 일 때만 기록을 이어갈 수 있다.
 */
const claimSentryAlert = async (summary: SentryAlertSummary): Promise<ClaimOutcome> => {
  const secret = process.env.SENTRY_ALERT_LOG_SECRET?.trim();
  if (!secret) {
    console.error("[sentry-alerts] SENTRY_ALERT_LOG_SECRET is not configured; skipping the record");
    return { status: "unconfigured" };
  }

  const response = await callRpc("claim_sentry_alert", {
    secret,
    payload: {
      issueId: summary.issueId,
      eventId: summary.eventId,
      shortId: summary.shortId ?? null,
      title: summary.title,
      culprit: summary.culprit ?? null,
      level: summary.level ?? null,
      environment: summary.environment ?? null,
      release: summary.release ?? null,
      webUrl: summary.webUrl ?? null,
    },
  });
  if (!response) return { status: "failed" };

  if (!response.ok) {
    await logUpstreamError("claim", response);
    return { status: "failed" };
  }

  return readClaimBody(await response.text().catch(() => null));
};

/**
 * 선점한 행에 판정 결과와 전송 여부를 기록한다.
 * 실패해도 예외를 올리지 않는다. 기록 실패가 알림 흐름을 멈추면 안 된다.
 *
 * @returns 기록에 성공하면 true.
 */
const completeSentryAlert = async (alertId: string, input: CompleteInput): Promise<boolean> => {
  const secret = process.env.SENTRY_ALERT_LOG_SECRET?.trim();
  if (!secret) return false;

  const { outcome, notified, notifyError } = input;
  const result =
    outcome.status === "ok"
      ? {
          ...outcome.result,
          provider: outcome.provider,
          model: outcome.model,
          latencyMs: outcome.latencyMs,
          triageStatus: "ok",
        }
      : { triageStatus: outcome.status, triageError: outcome.reason };

  const response = await callRpc("complete_sentry_alert", {
    secret,
    alert_id: alertId,
    result: { ...result, notified, notifyError: notifyError ?? null },
  });
  if (!response) return false;

  if (!response.ok) {
    await logUpstreamError("complete", response);
    return false;
  }
  return true;
};

export { claimSentryAlert, completeSentryAlert };
