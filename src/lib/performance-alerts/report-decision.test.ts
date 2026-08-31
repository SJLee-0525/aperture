import { describe, expect, it } from "vitest";

import { DISCORD_LIMIT, fitEmbed } from "@/lib/discord/embed-budget";
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

  it("강제 AI 분석은 이미 전송한 Lighthouse 경고도 다시 포함한다", () => {
    const first = buildPerformanceDecision({
      ...input(),
      lighthouse: [lighthouse(3_500)],
    });
    const second = buildPerformanceDecision({
      ...input(),
      previous: first.snapshot,
      lighthouse: [lighthouse(3_500)],
      forceAiAnalysis: true,
    });

    expect(second.cards).toHaveLength(1);
    expect(second.triageInputs[0]).toMatchObject({ target: target.url, scope: "lab" });
  });

  it.each([
    [
      "field",
      () => ({ ...input(), previous: previous(), crux: [crux(4_500)] }),
      () => ({ ...input(), crux: [crux(4_500)] }),
    ],
    [
      "lab",
      () => ({ ...input(), lighthouse: [lighthouse(3_500)] }),
      () => ({ ...input(), lighthouse: [lighthouse(3_500)] }),
    ],
  ])("강제 실행도 %s 경고의 중복 억제 key를 snapshot에 남긴다", (_kind, forced, repeat) => {
    const first = buildPerformanceDecision({ ...forced(), forceAiAnalysis: true });
    expect(first.cards).toHaveLength(1);
    expect(first.snapshot.sentAlerts.length).toBeGreaterThan(0);

    const second = buildPerformanceDecision({ ...repeat(), previous: first.snapshot });
    expect(second.cards).toEqual([]);
  });

  it("강제 실행도 데이터 부족 경고의 중복 억제 key를 snapshot에 남긴다", () => {
    const notFound: CollectedCruxResult = {
      query: { scope: "url", identifier: target.url, formFactor: "PHONE" },
      result: { status: "not_found" },
    };
    const first = buildPerformanceDecision({
      ...input(),
      crux: [notFound],
      forceAiAnalysis: true,
    });
    expect(first.cards[0]?.title).toContain("데이터 부족");

    const second = buildPerformanceDecision({
      ...input(),
      crux: [notFound],
      previous: first.snapshot,
    });
    expect(second.cards).toEqual([]);
  });

  it("경고가 아닌 데이터 부족 회차의 key는 강제 실행에서도 기록하지 않는다", () => {
    // 데이터 부족은 최초와 4회 연속만 알린다. 2회째는 알림이 아니므로 key도 남기지 않는다.
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
            consecutiveCount: 1,
          },
        ],
      },
    ];
    const notFound: CollectedCruxResult = {
      query: { scope: "url", identifier: target.url, formFactor: "PHONE" },
      result: { status: "not_found" },
    };
    const result = buildPerformanceDecision({
      ...input(),
      previous: prior,
      crux: [notFound],
      forceAiAnalysis: true,
    });

    expect(result.cards).toEqual([]);
    expect(result.snapshot.sentAlerts).toEqual([]);
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

  it("한 대상의 form factor별 연속 횟수를 한 줄에 모두 남긴다", () => {
    const prior = previous();
    prior.targets[0]!.measurements = [
      {
        scope: "url",
        formFactor: "desktop",
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
    const notFound = (formFactor: "PHONE" | "DESKTOP"): CollectedCruxResult => ({
      query: { scope: "url", identifier: target.url, formFactor },
      result: { status: "not_found" },
    });
    const result = buildPerformanceDecision({
      ...input(),
      previous: prior,
      crux: [notFound("PHONE"), notFound("DESKTOP")],
      lighthouse: [],
    });
    const summary = result.cards[0]?.fields?.find((field) => field.name === "Field")?.value ?? "";

    expect(summary).toContain(`${target.url}: phone 1회 · desktop 4회`);
  });

  it("데이터 부족 목록이 지면을 넘으면 남은 대상 수를 적고 잘리지 않는다", () => {
    const targets = Array.from({ length: 30 }, (_, index) => ({
      id: `target-${index}`,
      url: `https://sungjoon.works/ko/very/long/path/segment/number/${index}`,
    }));
    const notFound = (
      identifier: string,
      formFactor: "PHONE" | "DESKTOP",
    ): CollectedCruxResult => ({
      query: { scope: "url", identifier, formFactor },
      result: { status: "not_found" },
    });
    const result = buildPerformanceDecision({
      ...input(),
      targets,
      crux: targets.flatMap((item) => [notFound(item.url, "PHONE"), notFound(item.url, "DESKTOP")]),
      lighthouse: [],
    });
    const summary = result.cards[0]?.fields?.find((field) => field.name === "Field")?.value ?? "";

    expect(summary.length).toBeLessThanOrEqual(DISCORD_LIMIT.fieldValue);
    expect(summary.endsWith("…")).toBe(false);
    expect(summary).toMatch(/외 \d+개 대상$/);
    // fitEmbed를 한 번 더 통과해도 목록이 다시 잘리지 않는다.
    expect(fitEmbed(result.cards[0]!).fields?.find((field) => field.name === "Field")?.value).toBe(
      summary,
    );
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
