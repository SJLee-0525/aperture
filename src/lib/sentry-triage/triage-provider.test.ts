import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TRIAGE_INSTRUCTIONS } from "@/lib/sentry-triage/triage-prompt";
import { getTriageProvider, SENTRY_TRIAGE_CONTRACT } from "@/lib/sentry-triage/triage-provider";
import { buildTriageSchema, parseTriageResult } from "@/lib/sentry-triage/triage-schema";
import { TriageProviderUnavailableError } from "@/lib/triage/provider";

import type { SentryAlertSummary } from "@/types/sentry-alert";

const summary: SentryAlertSummary = {
  issueId: "1",
  eventId: "2",
  title: "EvalError: capture",
  environment: "production",
  tags: { app_runtime: "browser" },
  frames: [{ filename: "app.ts", function: "handle", lineno: 12 }],
};

describe("SENTRY_TRIAGE_CONTRACT", () => {
  it("기존 env 이름과 스키마 이름을 유지한다", () => {
    expect(SENTRY_TRIAGE_CONTRACT.envPrefix).toBe("TRIAGE");
    expect(SENTRY_TRIAGE_CONTRACT.schemaName).toBe("sentry_triage");
    expect(SENTRY_TRIAGE_CONTRACT.instructions).toBe(TRIAGE_INSTRUCTIONS);
  });

  it("출력 예산과 구간 상한이 요청 크기와 무관하다", () => {
    expect(SENTRY_TRIAGE_CONTRACT.outputTokens(summary)).toBe(1_500);
    expect(SENTRY_TRIAGE_CONTRACT.timeoutMs(summary, 20_000)).toBe(20_000);
    expect(SENTRY_TRIAGE_CONTRACT.timeoutMs(summary, 15_000)).toBe(15_000);
  });

  it("계약의 스키마와 파서가 이 계열 구현과 같다", () => {
    expect(SENTRY_TRIAGE_CONTRACT.schema(true)).toEqual(buildTriageSchema({ strict: true }));
    expect(SENTRY_TRIAGE_CONTRACT.schema(false)).toEqual(buildTriageSchema({ strict: false }));
    expect(SENTRY_TRIAGE_CONTRACT.parse("not json", summary)).toBeNull();
    expect(SENTRY_TRIAGE_CONTRACT.parse('{"severity":"urgent"}', summary)).toEqual(
      parseTriageResult('{"severity":"urgent"}'),
    );
  });

  it("mock 판정은 확신도 low 로 설정 안내만 담는다", () => {
    const mock = SENTRY_TRIAGE_CONTRACT.mockResult!(summary);

    expect(mock.confidence).toBe("low");
    expect(mock.probableCause).toContain("TRIAGE_PROVIDER");
    expect(mock.recommendedActions.length).toBeGreaterThan(0);
  });
});

describe("getTriageProvider", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("TRIAGE_PROVIDER=mock 이면 외부 호출 없이 mock 판정을 낸다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "mock");

    const response = await getTriageProvider()(summary, new AbortController().signal);

    expect(response.provider).toBe("mock");
    expect(response.model).toBe("mock");
    expect(response.result.confidence).toBe("low");
  });

  it("아무것도 설정되지 않으면 호출 시 예외를 던진다", async () => {
    const run = getTriageProvider()(summary, new AbortController().signal);

    await expect(run).rejects.toBeInstanceOf(TriageProviderUnavailableError);
  });
});
