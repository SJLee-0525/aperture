import { describe, expect, it } from "vitest";

import {
  judgeFieldMetric,
  judgeInsufficientData,
  judgeLab,
  performanceStatus,
} from "@/lib/performance-alerts/performance-status";

describe("performanceStatus", () => {
  it.each([
    ["LCP", 2_500, "good"],
    ["LCP", 2_501, "needs_improvement"],
    ["LCP", 4_000, "needs_improvement"],
    ["LCP", 4_001, "poor"],
    ["INP", 200, "good"],
    ["INP", 201, "needs_improvement"],
    ["INP", 500, "needs_improvement"],
    ["INP", 501, "poor"],
    ["CLS", 0.1, "good"],
    ["CLS", 0.1001, "needs_improvement"],
    ["CLS", 0.25, "needs_improvement"],
    ["CLS", 0.2501, "poor"],
  ] as const)("%s %s를 %s로 분류한다", (metric, value, status) => {
    expect(performanceStatus(metric, value)).toBe(status);
  });
});

describe("judgeFieldMetric", () => {
  const previous = {
    metric: "LCP" as const,
    value: 3_000,
    status: "needs_improvement" as const,
    collectionPeriod: "2026-08-20",
  };

  it("LCP가 15% 악화되고 기준 밖이면 회귀로 판정한다", () => {
    const result = judgeFieldMetric(
      { metric: "LCP", value: 3_450, collectionPeriod: "2026-08-21" },
      previous,
    );
    expect(result).toMatchObject({ comparison: "newer", change: 0.15, alert: "regression" });
  });

  it("poor 첫 진입은 15% 미만이어도 알린다", () => {
    const result = judgeFieldMetric(
      { metric: "LCP", value: 4_001, collectionPeriod: "2026-08-21" },
      { ...previous, value: 3_900 },
    );
    expect(result.alert).toBe("poor_entry");
  });

  it("CLS는 절대 0.03 악화를 사용한다", () => {
    const result = judgeFieldMetric(
      { metric: "CLS", value: 0.14, collectionPeriod: "2026-08-21" },
      {
        metric: "CLS",
        value: 0.11,
        status: "needs_improvement",
        collectionPeriod: "2026-08-20",
      },
    );
    expect(result.alert).toBe("regression");
    expect(result.change).toBeCloseTo(0.03);
  });

  it.each([
    ["2026-08-20", "same_period"],
    ["2026-08-19", "older_period"],
  ] as const)("비교 불가능한 period %s에서는 회귀를 만들지 않는다", (period, comparison) => {
    const result = judgeFieldMetric(
      { metric: "LCP", value: 5_000, collectionPeriod: period },
      previous,
    );
    expect(result).toMatchObject({ comparison, previousValue: null, change: null, alert: null });
  });

  it("이전 값이 0이면 비율 회귀를 계산하지 않는다", () => {
    const result = judgeFieldMetric(
      { metric: "INP", value: 600, collectionPeriod: "2026-08-21" },
      { metric: "INP", value: 0, status: "good", collectionPeriod: "2026-08-20" },
    );
    expect(result).toMatchObject({ change: null, alert: "poor_entry" });
  });
});

describe("judgeInsufficientData", () => {
  it.each([
    [0, 1, true],
    [1, 2, false],
    [2, 3, false],
    [3, 4, true],
    [4, 5, false],
  ])("이전 %i회에서 %i회 연속 상태를 계산한다", (previous, count, alert) => {
    expect(judgeInsufficientData("record_missing", previous)).toMatchObject({
      reason: "record_missing",
      consecutiveCount: count,
      alert,
    });
  });

  it("record 전체 없음과 metric 누락을 구분한다", () => {
    expect(judgeInsufficientData("metric_missing").reason).toBe("metric_missing");
  });
});

describe("judgeLab", () => {
  it("고정 임계값과 20% 회귀를 각각 남긴다", () => {
    const result = judgeLab(
      { lcp: 3_001, cls: 0.11, performanceScore: 0.79, tbt: 120 },
      { lcp: 2_000, cls: 0.05, performanceScore: 0.9, tbt: 100 },
    );
    expect(result.kind).toBe("lab");
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "LCP", reason: "threshold" }),
        expect.objectContaining({ metric: "CLS", reason: "threshold" }),
        expect.objectContaining({ metric: "performanceScore", reason: "threshold" }),
        expect.objectContaining({ metric: "LCP", reason: "regression" }),
        expect.objectContaining({ metric: "TBT", reason: "regression" }),
      ]),
    );
  });

  it("이전 값이 없으면 고정 임계값만 판정한다", () => {
    const result = judgeLab({ lcp: 2_000, cls: 0.01, performanceScore: 0.95, tbt: 20 });
    expect(result.alerts).toEqual([]);
  });
});
