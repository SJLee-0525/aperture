import { describe, expect, it } from "vitest";

import {
  aggregateValues,
  diagnosticsFrom,
  metricValues,
  summarizeLighthouseRuns,
} from "@/lib/performance-alerts/lighthouse-result";

const report = (offset = 0) => ({
  categories: { performance: { score: 0.9 - offset / 10_000 } },
  audits: {
    "largest-contentful-paint": { numericValue: 2_000 + offset },
    "cumulative-layout-shift": { numericValue: 0.05 + offset / 100_000 },
    "server-response-time": { numericValue: 200 + offset },
    "first-contentful-paint": { numericValue: 1_000 + offset },
    "total-blocking-time": { numericValue: 100 + offset },
    "speed-index": { numericValue: 1_500 + offset },
    "lcp-discovery-insight": {
      title: "LCP request discovery",
      numericValue: 320,
      displayValue: "320 ms",
      details: { items: [{ url: "https://example.com/private-detail" }] },
    },
    "unused-javascript": { title: "Reduce unused JavaScript", displayValue: "20 KiB" },
    screenshot: { title: "Screenshot", details: { data: "secret-image" } },
  },
});

describe("Lighthouse result", () => {
  it("허용한 metric만 읽는다", () => {
    expect(metricValues(report())).toEqual({
      lcp: 2_000,
      cls: 0.05,
      ttfb: 200,
      fcp: 1_000,
      tbt: 100,
      speedIndex: 1_500,
      performanceScore: 0.9,
    });
  });

  it.each([
    [{ categories: {}, audits: {} }, "performance category"],
    [
      {
        ...report(),
        audits: { ...report().audits, "largest-contentful-paint": { numericValue: NaN } },
      },
      "numericValue",
    ],
  ])("잘못된 report를 거부한다", (value, message) => {
    expect(() => metricValues(value)).toThrow(message);
  });

  it("세 값의 중앙값과 범위를 계산한다", () => {
    expect(aggregateValues([3, 1, 2])).toEqual({ value: 2, min: 1, max: 3 });
  });

  it("두 값만 남으면 나쁜 값을 사용한다", () => {
    expect(aggregateValues([1, 3])).toEqual({ value: 3, min: 1, max: 3 });
  });

  it.each([[[]], [[1]], [[1, 2, 3, 4]]])("허용하지 않는 실행 수를 거부한다", (values) => {
    expect(() => aggregateValues(values)).toThrow("requires 2 or 3");
  });

  it("대표 실행에서 허용한 audit 필드만 읽는다", () => {
    expect(diagnosticsFrom(report())).toEqual([
      {
        id: "lcp-discovery-insight",
        title: "LCP request discovery",
        numericValue: 320,
        displayValue: "320 ms",
      },
      { id: "unused-javascript", title: "Reduce unused JavaScript", displayValue: "20 KiB" },
    ]);
  });

  it("세 실행의 metric별 중앙값과 대표 실행 audit를 결합한다", () => {
    const result = summarizeLighthouseRuns([
      { url: "https://sungjoon.works/ko", isRepresentativeRun: false, report: report(200) },
      { url: "https://sungjoon.works/ko", isRepresentativeRun: true, report: report(0) },
      { url: "https://sungjoon.works/ko", isRepresentativeRun: false, report: report(100) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      url: "https://sungjoon.works/ko",
      status: "ok",
      runCount: 3,
      metrics: { lcp: { value: 2_100, min: 2_000, max: 2_200 } },
      diagnostics: [{ id: "lcp-discovery-insight" }, { id: "unused-javascript" }],
    });
  });

  it("두 실행은 partial이고 metric별 나쁜 값을 쓴다", () => {
    const [result] = summarizeLighthouseRuns([
      { url: "https://sungjoon.works/ko", isRepresentativeRun: true, report: report(0) },
      { url: "https://sungjoon.works/ko", isRepresentativeRun: false, report: report(100) },
    ]);
    expect(result).toMatchObject({ status: "partial", metrics: { lcp: { value: 2_100 } } });
  });

  it.each([
    [
      [{ url: "https://sungjoon.works/ko", isRepresentativeRun: true, report: report() }],
      "requires 2 or 3",
    ],
    [
      [
        { url: "https://sungjoon.works/ko", isRepresentativeRun: false, report: report() },
        { url: "https://sungjoon.works/ko", isRepresentativeRun: false, report: report() },
      ],
      "exactly one representative",
    ],
  ])("실행 계약 위반을 거부한다", (runs, message) => {
    expect(() => summarizeLighthouseRuns(runs)).toThrow(message);
  });
});
