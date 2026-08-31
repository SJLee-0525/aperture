import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  performanceTriageOutputTokens,
  performanceTriageTimeout,
} from "@/lib/performance-alerts/triage-prompt";
import {
  getPerformanceTriageProvider,
  PERFORMANCE_TRIAGE_CONTRACT,
} from "@/lib/performance-alerts/triage-provider";
import { buildPerformanceTriageSchema } from "@/lib/performance-alerts/triage-schema";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";

const input = (target: string): PerformanceTriageInput => ({
  target,
  scope: "url",
  formFactor: "PHONE",
  collectionPeriod: null,
  release: null,
  metrics: [{ source: "field", metric: "LCP", current: 4_500, previous: 3_000, status: "poor" }],
  diagnostics: [],
});

const inputs = (count: number): PerformanceTriageInput[] =>
  Array.from({ length: count }, (_, index) => input(`https://example.com/${index}`));

describe("PERFORMANCE_TRIAGE_CONTRACT", () => {
  it("기존 env 이름과 스키마 이름을 유지한다", () => {
    expect(PERFORMANCE_TRIAGE_CONTRACT.envPrefix).toBe("PERFORMANCE_TRIAGE");
    expect(PERFORMANCE_TRIAGE_CONTRACT.schemaName).toBe("performance_triage");
  });

  it("출력 예산과 구간 상한이 대상 수에 비례한다", () => {
    for (const count of [1, 5, 20]) {
      expect(PERFORMANCE_TRIAGE_CONTRACT.outputTokens(inputs(count))).toBe(
        performanceTriageOutputTokens(count),
      );
      expect(PERFORMANCE_TRIAGE_CONTRACT.timeoutMs(inputs(count), 20_000)).toBe(
        performanceTriageTimeout(count, 20_000),
      );
    }
  });

  it("계약의 스키마가 이 계열 구현과 같다", () => {
    expect(PERFORMANCE_TRIAGE_CONTRACT.schema(true)).toEqual(
      buildPerformanceTriageSchema({ strict: true }),
    );
    expect(PERFORMANCE_TRIAGE_CONTRACT.schema(false)).toEqual(
      buildPerformanceTriageSchema({ strict: false }),
    );
  });

  it("파서가 요청 대상 수와 다른 응답을 거부한다", () => {
    const twoTargets = JSON.stringify({
      commonSummary: "요약",
      commonCauses: [],
      targets: [0, 1].map((targetIndex) => ({
        targetIndex,
        summary: "요약",
        userImpact: "영향",
        likelyCauses: [],
        inspectFirst: [],
        recommendedChecks: [],
        confidence: "low",
      })),
    });

    expect(PERFORMANCE_TRIAGE_CONTRACT.parse(twoTargets, inputs(2))).not.toBeNull();
    expect(PERFORMANCE_TRIAGE_CONTRACT.parse(twoTargets, inputs(1))).toBeNull();
  });

  it("mock 판정은 대상 수만큼 targets 를 만든다", () => {
    const mock = PERFORMANCE_TRIAGE_CONTRACT.mockResult!(inputs(3));

    expect(mock.targets).toHaveLength(3);
    expect(mock.targets.map((target) => target.targetIndex)).toEqual([0, 1, 2]);
    expect(mock.targets[0]!.confidence).toBe("low");
  });
});

describe("getPerformanceTriageProvider", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("mock provider 는 외부 요청 없이 결과를 만든다", async () => {
    vi.stubEnv("PERFORMANCE_TRIAGE_PROVIDER", "mock");

    const response = await getPerformanceTriageProvider()(inputs(1), new AbortController().signal);

    expect(response.provider).toBe("mock");
    expect(response.model).toBe("mock");
    expect(response.result.targets).toHaveLength(1);
  });

  it("설정되지 않으면 기본 카드 경로로 사용할 실패를 반환한다", async () => {
    const run = getPerformanceTriageProvider()(inputs(1), new AbortController().signal);

    await expect(run).rejects.toThrow("Triage provider is not configured");
  });
});
