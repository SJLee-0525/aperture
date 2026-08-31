import { describe, expect, it } from "vitest";

import {
  compareMetricSeverity,
  rankMetrics,
  targetSeverityKey,
} from "@/lib/performance-alerts/metric-severity";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";

type TriageMetric = PerformanceTriageInput["metrics"][number];

const metric = (overrides: Partial<TriageMetric> = {}): TriageMetric => ({
  source: "field",
  metric: "LCP",
  current: 2_000,
  previous: 1_900,
  status: "good",
  ...overrides,
});

const input = (overrides: Partial<PerformanceTriageInput> = {}): PerformanceTriageInput => ({
  target: "https://example.test/ko",
  scope: "url",
  formFactor: "phone",
  collectionPeriod: null,
  release: null,
  metrics: [],
  diagnostics: [],
  ...overrides,
});

describe("compareMetricSeverity", () => {
  it("poor metric이 크게 개선된 good metric을 이긴다", () => {
    const poor = metric({ metric: "CLS", status: "poor", current: 0.4, previous: 0.4 });
    const good = metric({ metric: "LCP", status: "good", current: 1_000, previous: 4_000 });
    expect(compareMetricSeverity(poor, good)).toBeLessThan(0);
  });

  it("이전 값이 없는 poor metric이 이전 값 있는 good metric을 이긴다", () => {
    const poor = metric({ metric: "CLS", status: "poor", current: 0.4, previous: null });
    const good = metric({ metric: "LCP", status: "good", current: 2_400, previous: 1_000 });
    expect(compareMetricSeverity(poor, good)).toBeLessThan(0);
  });

  it("개선 중인 metric이 같은 등급의 악화 중인 metric에게 진다", () => {
    const improving = metric({ status: "poor", current: 4_500, previous: 6_000 });
    const worsening = metric({ status: "poor", current: 6_000, previous: 4_500 });
    expect(compareMetricSeverity(improving, worsening)).toBeGreaterThan(0);
  });

  it("performanceScore 하락은 악화로 잡히고 상승은 잡히지 않는다", () => {
    const dropped = metric({
      source: "lab",
      metric: "performanceScore",
      status: "poor",
      current: 0.75,
      previous: 0.85,
    });
    const raised = metric({
      source: "lab",
      metric: "performanceScore",
      status: "poor",
      current: 0.95,
      previous: 0.85,
    });
    expect(compareMetricSeverity(dropped, raised)).toBeLessThan(0);
  });

  it("알 수 없는 status는 good보다 아래다", () => {
    const unknown = metric({ status: "unmeasured" });
    const good = metric({ status: "good" });
    expect(compareMetricSeverity(unknown, good)).toBeGreaterThan(0);
  });
});

describe("rankMetrics", () => {
  it("2단계까지 같으면 lab을 field보다 위에 둔다", () => {
    const field = metric({ source: "field", metric: "LCP", current: 2_000, previous: 2_000 });
    const lab = metric({ source: "lab", metric: "LCP", current: 2_000, previous: 2_000 });
    expect(rankMetrics([field, lab])).toEqual([lab, field]);
  });

  it("모르는 metric을 뒤로 보내지만 버리지 않는다", () => {
    const known = metric({ metric: "LCP", current: 2_000, previous: 2_000 });
    const unknown = metric({ metric: "interactionToNextPaintV2", current: 2_000, previous: 2_000 });
    const ranked = rankMetrics([unknown, known]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toBe(known);
    expect(ranked[1]).toBe(unknown);
  });

  it("비정상 수치가 있어도 예외 없이 뒤로 보낸다", () => {
    const broken = metric({ metric: "CLS", current: Number.NaN, previous: 0.1 });
    const worsened = metric({ metric: "CLS", current: 0.3, previous: 0.1 });
    expect(rankMetrics([broken, worsened])).toEqual([worsened, broken]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const metrics = [
      metric({ metric: "LCP", status: "good" }),
      metric({ metric: "CLS", status: "poor", current: 0.4, previous: 0.1 }),
    ];
    const before = [...metrics];
    rankMetrics(metrics);
    expect(metrics).toEqual(before);
  });

  it("같은 입력을 두 번 정렬하면 같은 순서다", () => {
    const metrics = [
      metric({ metric: "TTFB", source: "lab", current: 900, previous: 900 }),
      metric({ metric: "FCP", source: "lab", current: 1_000, previous: 1_000 }),
      metric({ metric: "TBT", source: "lab", current: 300, previous: 300 }),
    ];
    expect(rankMetrics(metrics)).toEqual(rankMetrics(metrics));
  });
});

describe("targetSeverityKey", () => {
  it("가장 심각한 metric의 등급을 대상 순위로 쓴다", () => {
    const key = targetSeverityKey(
      input({
        metrics: [
          metric({ metric: "LCP", status: "good" }),
          metric({ metric: "CLS", status: "poor", current: 0.4, previous: 0.1 }),
        ],
      }),
    );
    expect(key.statusRank).toBe(3);
    expect(key.severity).toBeCloseTo(3, 10);
  });

  it("metric이 없는 대상은 최하위 키를 갖는다", () => {
    const key = targetSeverityKey(input());
    expect(key.statusRank).toBe(0);
    expect(key.severity).toBe(0);
  });
});
