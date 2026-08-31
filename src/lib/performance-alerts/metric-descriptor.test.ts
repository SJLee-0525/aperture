import { describe, expect, it } from "vitest";

import {
  describeMetric,
  formatDelta,
  severityRatio,
  worseningDelta,
  worseOf,
} from "@/lib/performance-alerts/metric-descriptor";

describe("describeMetric", () => {
  it.each([
    ["LCP", "lcp"],
    ["CLS", "cls"],
    ["INP", "inp"],
  ])("field 이름 %s와 lab 이름 %s가 같은 기술자를 가리킨다", (fieldName, labName) => {
    expect(describeMetric(fieldName)).toEqual(describeMetric(labName));
  });

  it("performanceScore만 클수록 좋은 metric이다", () => {
    expect(describeMetric("performanceScore")?.higherIsBetter).toBe(true);
    expect(describeMetric("lcp")?.higherIsBetter).toBe(false);
    expect(describeMetric("cls")?.higherIsBetter).toBe(false);
  });

  it("모르는 이름은 null이다", () => {
    expect(describeMetric("interactionToNextPaintV2")).toBeNull();
  });
});

describe("worseOf", () => {
  it("클수록 나쁜 metric은 큰 값을 고른다", () => {
    expect(worseOf("lcp", 1, 3)).toBe(3);
  });

  it("performanceScore는 낮은 값을 고른다", () => {
    expect(worseOf("performanceScore", 0.75, 0.85)).toBe(0.75);
  });

  it("모르는 metric은 큰 값을 골라 회귀를 낙관하지 않는다", () => {
    expect(worseOf("unknownMetric", 1, 3)).toBe(3);
  });
});

describe("worseningDelta", () => {
  it("performanceScore 하락을 양수 악화량으로 만든다", () => {
    expect(worseningDelta("performanceScore", 0.75, 0.85)).toBeCloseTo(0.1, 10);
  });

  it("performanceScore 상승은 악화가 아니다", () => {
    expect(worseningDelta("performanceScore", 0.85, 0.75)).toBeNull();
  });

  it("값이 같으면 악화가 아니다", () => {
    expect(worseningDelta("lcp", 2_000, 2_000)).toBeNull();
  });

  it("모르는 metric은 null이다", () => {
    expect(worseningDelta("unknownMetric", 3, 1)).toBeNull();
  });
});

describe("severityRatio", () => {
  it("performanceScore 0.85에서 0.75로의 하락은 척도 한 배다", () => {
    expect(severityRatio("performanceScore", 0.75, 0.85)).toBeCloseTo(1, 10);
  });

  it("CLS 0.15 악화가 LCP 30ms 악화를 이긴다", () => {
    const cls = severityRatio("cls", 0.35, 0.2) ?? 0;
    const lcp = severityRatio("lcp", 2_030, 2_000) ?? 0;
    expect(cls).toBeGreaterThan(lcp);
  });

  it("개선이면 null이다", () => {
    expect(severityRatio("lcp", 2_000, 2_500)).toBeNull();
  });

  it.each([
    [Number.NaN, 2_000],
    [2_500, Number.NaN],
    [Number.POSITIVE_INFINITY, 2_000],
  ])("비정상 수치(%s, %s)는 null이다", (current, previous) => {
    expect(severityRatio("lcp", current, previous)).toBeNull();
  });
});

describe("formatDelta", () => {
  it("performanceScore 하락을 음수로 적는다", () => {
    expect(formatDelta("performanceScore", 0.75, 0.85)).toBe("-0.10");
  });

  it("CLS 변화를 소수 세 자리로 적고 단위를 붙이지 않는다", () => {
    expect(formatDelta("cls", 0.35, 0.2)).toBe("+0.150");
  });

  it("ms metric은 정수와 단위로 적는다", () => {
    expect(formatDelta("lcp", 2_030, 2_000)).toBe("+30ms");
  });

  it("모르는 metric은 단위 없이 소수 세 자리로 적는다", () => {
    expect(formatDelta("unknownMetric", 1.5, 1)).toBe("+0.500");
  });
});
