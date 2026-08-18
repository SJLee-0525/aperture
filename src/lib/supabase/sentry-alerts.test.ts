import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { claimSentryAlert, completeSentryAlert } from "@/lib/supabase/sentry-alerts";

import type { SentryAlertSummary, TriageOutcome } from "@/types/sentry-alert";

const summary: SentryAlertSummary = {
  issueId: "1000000001",
  eventId: "aaaa",
  title: "EvalError: capture",
  culprit: "/:lang",
  level: "error",
  environment: "production",
  release: "aperture@abc1234",
  webUrl: "https://sentry.io/x",
  tags: { app_runtime: "browser" },
  frames: [{ filename: "app.ts", function: "handle", lineno: 1 }],
};

const okOutcome: TriageOutcome = {
  status: "ok",
  result: {
    severity: "high",
    isNoise: false,
    userImpact: "화면이 비어 있다",
    probableCause: "빈 문서를 참조한다",
    suspectArea: "app.ts",
    recommendedActions: ["필터한다"],
    confidence: "medium",
  },
  provider: "openai",
  model: "gpt-5.6-luna",
  latencyMs: 3900,
};

const calls = (mock: { mock: { calls: unknown[] } }) =>
  mock.mock.calls as unknown as [string, RequestInit][];

const stubFetch = (impl: () => Promise<Response>) => {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.stubEnv("SENTRY_ALERT_LOG_SECRET", "shared");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("claimSentryAlert", () => {
  it("행 id 를 받으면 선점 성공이다", async () => {
    stubFetch(async () => new Response(JSON.stringify("row-1")));

    await expect(claimSentryAlert(summary)).resolves.toEqual({
      status: "claimed",
      alertId: "row-1",
    });
  });

  it("null 은 같은 전달이 이미 처리된 것으로 본다", async () => {
    stubFetch(async () => new Response("null"));

    await expect(claimSentryAlert(summary)).resolves.toEqual({ status: "duplicate" });
  });

  it("시크릿이 없으면 설정 오류로 구분하고 호출하지 않는다", async () => {
    vi.stubEnv("SENTRY_ALERT_LOG_SECRET", "");
    const fetchMock = stubFetch(async () => new Response("null"));

    await expect(claimSentryAlert(summary)).resolves.toEqual({ status: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("업스트림 오류는 런타임 실패로 구분한다", async () => {
    stubFetch(async () => new Response("permission denied", { status: 403 }));

    await expect(claimSentryAlert(summary)).resolves.toEqual({ status: "failed" });
  });

  it("네트워크 오류도 런타임 실패다", async () => {
    stubFetch(async () => {
      throw new Error("down");
    });

    await expect(claimSentryAlert(summary)).resolves.toEqual({ status: "failed" });
  });

  it("RPC 경로와 헤더를 계약대로 부른다", async () => {
    const fetchMock = stubFetch(async () => new Response(JSON.stringify("row-1")));
    await claimSentryAlert(summary);

    const [url, init] = calls(fetchMock)[0];
    expect(url).toBe("https://project.supabase.co/rest/v1/rpc/claim_sentry_alert");
    expect(init.method).toBe("POST");
    const sent = init.headers as Record<string, string>;
    expect(sent.apikey).toBe("sb_publishable_x");
    expect(sent).not.toHaveProperty("Authorization");
  });

  it("요약에서 기록할 필드만 보낸다", async () => {
    const fetchMock = stubFetch(async () => new Response(JSON.stringify("row-1")));
    await claimSentryAlert(summary);

    const body = JSON.parse(calls(fetchMock)[0][1].body as string);
    expect(Object.keys(body.payload).sort()).toEqual([
      "culprit",
      "environment",
      "eventId",
      "issueId",
      "level",
      "release",
      "shortId",
      "title",
      "webUrl",
    ]);
  });

  it("스택과 태그는 기록에 보내지 않는다", async () => {
    const fetchMock = stubFetch(async () => new Response(JSON.stringify("row-1")));
    await claimSentryAlert(summary);

    const body = calls(fetchMock)[0][1].body as string;
    expect(body).not.toContain("frames");
    expect(body).not.toContain("app_runtime");
  });
});

describe("completeSentryAlert", () => {
  it("판정 결과와 전송 여부를 함께 기록한다", async () => {
    const fetchMock = stubFetch(async () => new Response("null"));

    await expect(
      completeSentryAlert("row-1", { outcome: okOutcome, notified: true }),
    ).resolves.toBe(true);

    const body = JSON.parse(calls(fetchMock)[0][1].body as string);
    expect(body.alert_id).toBe("row-1");
    expect(body.result).toMatchObject({
      severity: "high",
      provider: "openai",
      model: "gpt-5.6-luna",
      latencyMs: 3900,
      triageStatus: "ok",
      notified: true,
    });
  });

  it("판정 실패는 사유와 상태만 기록한다", async () => {
    const fetchMock = stubFetch(async () => new Response("null"));

    await completeSentryAlert("row-1", {
      outcome: { status: "failed", reason: "제공자 응답 없음" },
      notified: true,
    });

    const body = JSON.parse(calls(fetchMock)[0][1].body as string);
    expect(body.result).toMatchObject({
      triageStatus: "failed",
      triageError: "제공자 응답 없음",
      notified: true,
    });
    expect(body.result).not.toHaveProperty("severity");
  });

  it("상한 초과는 skipped 로 기록한다", async () => {
    const fetchMock = stubFetch(async () => new Response("null"));

    await completeSentryAlert("row-1", {
      outcome: { status: "skipped", reason: "일일 상한 초과" },
      notified: true,
    });

    expect(JSON.parse(calls(fetchMock)[0][1].body as string).result.triageStatus).toBe("skipped");
  });

  it("전송 실패 사유를 남긴다", async () => {
    const fetchMock = stubFetch(async () => new Response("null"));

    await completeSentryAlert("row-1", {
      outcome: okOutcome,
      notified: false,
      notifyError: "429 retry_after 30000ms",
    });

    const body = JSON.parse(calls(fetchMock)[0][1].body as string);
    expect(body.result.notified).toBe(false);
    expect(body.result.notifyError).toBe("429 retry_after 30000ms");
  });

  it("시크릿이 없으면 호출하지 않고 실패로 돌려준다", async () => {
    vi.stubEnv("SENTRY_ALERT_LOG_SECRET", "");
    const fetchMock = stubFetch(async () => new Response("null"));

    await expect(
      completeSentryAlert("row-1", { outcome: okOutcome, notified: true }),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("업스트림 오류를 예외로 올리지 않는다", async () => {
    stubFetch(async () => new Response("nope", { status: 500 }));

    await expect(
      completeSentryAlert("row-1", { outcome: okOutcome, notified: true }),
    ).resolves.toBe(false);
  });

  it("네트워크 오류도 예외로 올리지 않는다", async () => {
    stubFetch(async () => {
      throw new Error("down");
    });

    await expect(
      completeSentryAlert("row-1", { outcome: okOutcome, notified: true }),
    ).resolves.toBe(false);
  });
});
