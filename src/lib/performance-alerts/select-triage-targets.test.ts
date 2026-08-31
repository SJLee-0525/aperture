import { describe, expect, it } from "vitest";

import { selectTriageTargets } from "@/lib/performance-alerts/select-triage-targets";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";

const input = (
  target: string,
  metrics: PerformanceTriageInput["metrics"] = [],
): PerformanceTriageInput => ({
  target,
  scope: "url",
  formFactor: "phone",
  collectionPeriod: null,
  release: null,
  metrics,
  diagnostics: [],
});

const lcp = (status: string, current: number, previous: number | null) => [
  { source: "field" as const, metric: "LCP", current, previous, status },
];

describe("selectTriageTargets", () => {
  it("상한을 넘으면 상한만큼만 고르고 나머지 수를 알린다", () => {
    const inputs = Array.from({ length: 26 }, (_, index) => input(`https://example.test/${index}`));
    const result = selectTriageTargets(inputs, 20);

    expect(result.selected).toHaveLength(20);
    expect(result.omitted).toBe(6);
  });

  it("상한 이하면 전부 고르고 생략이 없다", () => {
    const result = selectTriageTargets([input("https://example.test/a")], 20);

    expect(result.selected).toHaveLength(1);
    expect(result.omitted).toBe(0);
  });

  it("poor 대상을 good 대상보다 먼저 고른다", () => {
    const good = input("https://example.test/good", lcp("good", 2_400, 1_000));
    const poor = input("https://example.test/poor", lcp("poor", 5_000, 4_900));
    const result = selectTriageTargets([good, poor], 1);

    expect(result.selected).toEqual([poor]);
    expect(result.omitted).toBe(1);
  });

  it("같은 등급이면 악화 폭이 큰 대상을 먼저 고른다", () => {
    const mild = input("https://example.test/mild", lcp("poor", 5_030, 5_000));
    const severe = input("https://example.test/severe", lcp("poor", 7_000, 5_000));
    const result = selectTriageTargets([mild, severe], 1);

    expect(result.selected).toEqual([severe]);
  });

  it("같은 입력을 두 번 넣으면 같은 순서를 만든다", () => {
    const inputs = Array.from({ length: 5 }, (_, index) => input(`https://example.test/${index}`));

    expect(selectTriageTargets(inputs, 3).selected).toEqual(
      selectTriageTargets(inputs, 3).selected,
    );
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const inputs = [
      input("https://example.test/good", lcp("good", 2_400, 2_400)),
      input("https://example.test/poor", lcp("poor", 5_000, 4_000)),
    ];
    const before = [...inputs];
    selectTriageTargets(inputs, 1);

    expect(inputs).toEqual(before);
  });
});
