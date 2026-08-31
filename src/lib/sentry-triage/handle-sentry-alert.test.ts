import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleSentryAlert } from "@/lib/sentry-triage/handle-sentry-alert";

import type { SentryAlertDependencies } from "@/lib/sentry-triage/handle-sentry-alert";
import type { TriageResult } from "@/types/sentry-alert";

const FIXTURE = readFileSync(path.join(__dirname, "__fixtures__/event-alert.json"), "utf8");

const verdict: TriageResult = {
  severity: "high",
  isNoise: false,
  userImpact: "화면이 비어 있다",
  probableCause: "빈 문서를 참조한다",
  suspectArea: "app.ts",
  recommendedActions: ["필터한다"],
  confidence: "medium",
};

const deps = (overrides: Partial<SentryAlertDependencies> = {}) => {
  const base: SentryAlertDependencies = {
    provider: vi.fn(async () => ({
      result: verdict,
      provider: "openai" as const,
      model: "gpt-5.6-luna",
    })),
    rateLimiter: vi.fn(async () => ({ allowed: true, count: 1 })),
    sendCard: vi.fn(async () => ({ ok: true as const })),
    claim: vi.fn(async () => ({ status: "claimed" as const, alertId: "row-1" })),
    complete: vi.fn(async () => true),
    now: (() => {
      let value = 1_000;
      return () => (value += 500);
    })(),
    ...overrides,
  };
  return base;
};

const sentCard = (d: SentryAlertDependencies) =>
  (d.sendCard as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { title: string; color: number };

const completedWith = (d: SentryAlertDependencies) =>
  (d.complete as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
    outcome: { status: string; reason?: string };
    notified: boolean;
    notifyError?: string;
  };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleSentryAlert — 정상 경로", () => {
  it("판정 카드를 보내고 결과를 기록한다", async () => {
    const d = deps();

    await handleSentryAlert(FIXTURE, d);

    expect(sentCard(d).title).toContain("[높음]");
    expect(completedWith(d)).toMatchObject({ notified: true });
    expect(completedWith(d).outcome).toMatchObject({ status: "ok", provider: "openai" });
  });

  it("LLM 을 부르기 전에 선점한다", async () => {
    const order: string[] = [];
    const d = deps({
      claim: vi.fn(async () => {
        order.push("claim");
        return { status: "claimed" as const, alertId: "row-1" };
      }),
      provider: vi.fn(async () => {
        order.push("provider");
        return { result: verdict, provider: "openai" as const, model: "m" };
      }),
    });

    await handleSentryAlert(FIXTURE, d);

    expect(order).toEqual(["claim", "provider"]);
  });

  it("판정 소요 시간을 기록에 담는다", async () => {
    const d = deps();

    await handleSentryAlert(FIXTURE, d);

    expect(completedWith(d).outcome).toMatchObject({ latencyMs: 500 });
  });
});

describe("handleSentryAlert — 실패 모드", () => {
  it("본문을 읽을 수 없으면 카드도 기록도 없다", async () => {
    const d = deps();

    await handleSentryAlert("not json", d);

    expect(d.claim).not.toHaveBeenCalled();
    expect(d.sendCard).not.toHaveBeenCalled();
  });

  it("식별자가 없는 본문도 조용히 버린다", async () => {
    const d = deps();

    await handleSentryAlert(JSON.stringify({ data: { event: {} } }), d);

    expect(d.sendCard).not.toHaveBeenCalled();
  });

  it("같은 전달 재전송이면 아무것도 하지 않는다", async () => {
    const d = deps({ claim: vi.fn(async () => ({ status: "duplicate" as const })) });

    await handleSentryAlert(FIXTURE, d);

    expect(d.provider).not.toHaveBeenCalled();
    expect(d.sendCard).not.toHaveBeenCalled();
    expect(d.complete).not.toHaveBeenCalled();
  });

  it("기록 시크릿이 없으면 판정을 건너뛰고 카드만 보낸다", async () => {
    const d = deps({ claim: vi.fn(async () => ({ status: "unconfigured" as const })) });

    await handleSentryAlert(FIXTURE, d);

    expect(d.provider).not.toHaveBeenCalled();
    expect(d.sendCard).toHaveBeenCalledTimes(1);
    expect(d.complete).not.toHaveBeenCalled();
  });

  it("선점이 런타임 실패하면 판정을 건너뛰고 카드만 보낸다", async () => {
    const d = deps({ claim: vi.fn(async () => ({ status: "failed" as const })) });

    await handleSentryAlert(FIXTURE, d);

    // 멱등성이 없는 구간이라 재전송이 유료 호출로 이어지지 않아야 한다.
    expect(d.provider).not.toHaveBeenCalled();
    expect(d.rateLimiter).not.toHaveBeenCalled();
    expect(d.sendCard).toHaveBeenCalledTimes(1);
    expect(d.complete).not.toHaveBeenCalled();
  });

  it("선점 실패로 나간 카드는 판정 없는 기본 카드다", async () => {
    const d = deps({ claim: vi.fn(async () => ({ status: "failed" as const })) });

    await handleSentryAlert(FIXTURE, d);

    expect(sentCard(d).color).toBe(0x8b8d98);
  });

  it("일일 상한을 넘으면 LLM 을 건너뛰고 기본 카드를 보낸다", async () => {
    const d = deps({ rateLimiter: vi.fn(async () => ({ allowed: false, count: 51 })) });

    await handleSentryAlert(FIXTURE, d);

    expect(d.provider).not.toHaveBeenCalled();
    expect(d.sendCard).toHaveBeenCalledTimes(1);
    expect(completedWith(d).outcome).toMatchObject({ status: "skipped" });
    expect(completedWith(d).outcome.reason).toContain("51");
  });

  it("제공자가 실패해도 기본 카드를 보낸다", async () => {
    const d = deps({
      provider: vi.fn(async () => {
        throw new Error("제공자 응답 없음");
      }),
    });

    await handleSentryAlert(FIXTURE, d);

    expect(d.sendCard).toHaveBeenCalledTimes(1);
    expect(completedWith(d).outcome).toMatchObject({
      status: "failed",
      reason: "제공자 응답 없음",
    });
  });

  it("제한기가 던져도 판정과 알림을 그대로 진행한다", async () => {
    const d = deps({
      rateLimiter: vi.fn(async () => {
        throw new Error("upstash down");
      }),
    });

    await handleSentryAlert(FIXTURE, d);

    // 제공자 호출까지 확인해야 제한기 오류가 판정 실패로 뭉개지지 않은 것을 알 수 있다.
    expect(d.provider).toHaveBeenCalledTimes(1);
    expect(d.sendCard).toHaveBeenCalledTimes(1);
    expect(completedWith(d).outcome).toMatchObject({ status: "ok" });
  });

  it("전송이 실패하면 사유를 기록에 남긴다", async () => {
    const d = deps({
      sendCard: vi.fn(async () => ({ ok: false as const, error: "429 retry_after 30000ms" })),
    });

    await handleSentryAlert(FIXTURE, d);

    expect(completedWith(d)).toMatchObject({
      notified: false,
      notifyError: "429 retry_after 30000ms",
    });
  });

  it("기록이 실패해도 예외를 올리지 않는다", async () => {
    const d = deps({
      complete: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    await expect(handleSentryAlert(FIXTURE, d)).resolves.toBeUndefined();
  });

  it("전송기가 던져도 예외를 올리지 않는다", async () => {
    const d = deps({
      sendCard: vi.fn(async () => {
        throw new Error("discord down");
      }),
    });

    await expect(handleSentryAlert(FIXTURE, d)).resolves.toBeUndefined();
  });
});

describe("handleSentryAlert — 카드 내용", () => {
  it("판정이 없으면 회색 기본 카드가 나간다", async () => {
    const d = deps({
      provider: vi.fn(async () => {
        throw new Error("타임아웃");
      }),
    });

    await handleSentryAlert(FIXTURE, d);

    expect(sentCard(d).color).toBe(0x8b8d98);
    expect(sentCard(d).title).not.toContain("[");
  });

  it("노이즈 판정은 회색으로 내려간다", async () => {
    const d = deps({
      provider: vi.fn(async () => ({
        result: { ...verdict, isNoise: true },
        provider: "gemini" as const,
        model: "m",
      })),
    });

    await handleSentryAlert(FIXTURE, d);

    expect(sentCard(d).color).toBe(0x4a4a4a);
  });
});
