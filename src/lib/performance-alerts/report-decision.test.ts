import { describe, expect, it } from "vitest";

import { buildPerformanceDecision } from "@/lib/performance-alerts/report-decision";

import type { CollectedCruxResult } from "@/lib/performance-alerts/crux-client";
import type { LighthouseTargetResult } from "@/lib/performance-alerts/lighthouse-result";
import type { PerformanceSnapshot } from "@/lib/performance-alerts/snapshot";

const target = { id: "home", url: "https://sungjoon.works/ko" };
const metrics = (lcp = 2_000) => [
  { name: "LCP" as const, p75: lcp, goodRatio: 0.8, needsImprovementRatio: 0.15, poorRatio: 0.05 },
  { name: "INP" as const, p75: 100, goodRatio: 0.8, needsImprovementRatio: 0.15, poorRatio: 0.05 },
  { name: "CLS" as const, p75: 0.05, goodRatio: 0.8, needsImprovementRatio: 0.15, poorRatio: 0.05 },
];
const crux = (lcp = 2_000, period = "2026-08-30"): CollectedCruxResult => ({
  query: { scope: "url", identifier: target.url, formFactor: "PHONE" },
  result: {
    status: "ok",
    record: {
      scope: "url",
      identifier: target.url,
      formFactor: "phone",
      collectionPeriod: { firstDate: "2026-08-03", lastDate: period },
      metrics: metrics(lcp),
    },
  },
});
const range = (value: number) => ({ value, min: value, max: value });
const lighthouse = (lcp = 2_000): LighthouseTargetResult => ({
  url: target.url,
  status: "ok",
  runCount: 3,
  metrics: {
    lcp: range(lcp),
    cls: range(0.01),
    ttfb: range(200),
    fcp: range(1_000),
    tbt: range(20),
    speedIndex: range(1_500),
    performanceScore: range(0.95),
  },
  diagnostics: [],
});
const previous = (): PerformanceSnapshot => ({
  schemaVersion: 1,
  measuredAt: "2026-08-30T00:00:00.000Z",
  siteOrigin: "https://sungjoon.works",
  release: null,
  cruxCollectionPeriod: "2026-08-29",
  targets: [
    {
      id: "home",
      url: target.url,
      measurements: [
        {
          scope: "url",
          formFactor: "phone",
          collectionPeriod: "2026-08-29",
          metrics: [
            { name: "LCP", value: 3_000, status: "needs_improvement" },
            { name: "INP", value: 100, status: "good" },
            { name: "CLS", value: 0.05, status: "good" },
          ],
        },
      ],
    },
  ],
  sentAlerts: [],
});
const input = () => ({
  siteOrigin: "https://sungjoon.works",
  targets: [target],
  measuredAt: "2026-08-31T00:00:00.000Z",
  release: "abc123",
  crux: [crux()],
  lighthouse: [lighthouse()],
  previous: null as PerformanceSnapshot | null,
  actionsRunUrl: "https://github.com/owner/repo/actions/runs/1",
  sendBaseline: false,
});

describe("buildPerformanceDecision", () => {
  it("정상 측정은 카드 없이 snapshot만 만든다", () => {
    const result = buildPerformanceDecision(input());
    expect(result.cards).toEqual([]);
    expect(result.snapshot.targets[0]?.measurements).toHaveLength(2);
    expect(result.snapshot.cruxCollectionPeriod).toBe("2026-08-30");
  });

  it("수동 baseline 요청은 정상 카드 한 장을 만든다", () => {
    const result = buildPerformanceDecision({ ...input(), sendBaseline: true });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.title).toContain("기준선");
  });

  it("field와 lab이 함께 나쁘면 결합 카드와 중복 key를 만든다", () => {
    const result = buildPerformanceDecision({
      ...input(),
      previous: previous(),
      crux: [crux(4_500)],
      lighthouse: [lighthouse(3_500)],
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.title).toContain("field 및 lab");
    expect(result.triageInputs[0]).toMatchObject({
      target: target.url,
      scope: "url",
      formFactor: "phone 및 Lighthouse mobile",
    });
    expect(result.triageInputs[0]?.metrics.some((metric) => metric.metric === "LCP")).toBe(true);
    expect(result.snapshot.sentAlerts.length).toBeGreaterThanOrEqual(2);
  });

  it("같은 field 경고 key가 남아 있으면 카드를 다시 만들지 않는다", () => {
    const first = buildPerformanceDecision({
      ...input(),
      previous: previous(),
      crux: [crux(4_500)],
    });
    const second = buildPerformanceDecision({
      ...input(),
      previous: first.snapshot,
      crux: [crux(4_500)],
    });
    expect(second.cards).toEqual([]);
  });

  it("CrUX record 없음 4회째에 데이터 부족 카드를 만든다", () => {
    const prior = previous();
    prior.targets[0]!.measurements = [
      {
        scope: "url",
        formFactor: "phone",
        collectionPeriod: null,
        metrics: [
          {
            name: "record",
            value: null,
            status: "insufficient_data",
            insufficientReason: "record_missing",
            consecutiveCount: 3,
          },
        ],
      },
    ];
    const notFound: CollectedCruxResult = {
      query: { scope: "url", identifier: target.url, formFactor: "PHONE" },
      result: { status: "not_found" },
    };
    const result = buildPerformanceDecision({ ...input(), previous: prior, crux: [notFound] });
    expect(result.cards[0]?.title).toContain("데이터 부족");
    expect(result.triageInputs[0]).toBeNull();
    expect(result.snapshot.targets[0]?.measurements[0]?.metrics[0]).toMatchObject({
      status: "insufficient_data",
      consecutiveCount: 4,
    });
  });

  it("여러 대상의 CrUX 부족 알림을 실행당 한 장으로 합친다", () => {
    const secondTarget = { id: "dev", url: "https://sungjoon.works/ko/dev" };
    const notFound = (identifier: string): CollectedCruxResult => ({
      query: { scope: "url", identifier, formFactor: "PHONE" },
      result: { status: "not_found" },
    });
    const result = buildPerformanceDecision({
      ...input(),
      targets: [target, secondTarget],
      crux: [notFound(target.url), notFound(secondTarget.url)],
      lighthouse: [],
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.title).toContain("데이터 부족");
    expect(result.cards[0]?.fields?.some((field) => field.value.includes(target.url))).toBe(true);
    expect(result.cards[0]?.fields?.some((field) => field.value.includes(secondTarget.url))).toBe(
      true,
    );
  });
});
