import { worseOf } from "@/lib/performance-alerts/metric-descriptor";

const METRIC_AUDITS = {
  lcp: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  ttfb: "server-response-time",
  fcp: "first-contentful-paint",
  tbt: "total-blocking-time",
  speedIndex: "speed-index",
} as const;

const DIAGNOSTIC_AUDITS = [
  "largest-contentful-paint-element",
  "lcp-discovery-insight",
  "lcp-breakdown-insight",
  "render-blocking-resources",
  "render-blocking-insight",
  "unused-javascript",
  "uses-optimized-images",
  "uses-responsive-images",
  "image-delivery-insight",
  "long-tasks",
] as const;

type LighthouseMetricName = keyof typeof METRIC_AUDITS | "performanceScore";

type LighthouseRun = {
  url: string;
  isRepresentativeRun: boolean;
  report: unknown;
};

type MetricRange = {
  value: number;
  min: number;
  max: number;
};

type LighthouseDiagnostic = {
  id: string;
  title: string;
  numericValue?: number;
  displayValue?: string;
};

type LighthouseTargetResult = {
  url: string;
  status: "ok" | "partial";
  runCount: number;
  metrics: Record<LighthouseMetricName, MetricRange>;
  diagnostics: LighthouseDiagnostic[];
};

const asObject = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid Lighthouse ${label}`);
  }
  return value as Record<string, unknown>;
};

const finiteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid Lighthouse ${label}`);
  }
  return value;
};

const metricValues = (report: unknown): Record<LighthouseMetricName, number> => {
  const root = asObject(report, "report");
  const audits = asObject(root.audits, "audits");
  const categories = asObject(root.categories, "categories");
  const performance = asObject(categories.performance, "performance category");
  const values = Object.fromEntries(
    Object.entries(METRIC_AUDITS).map(([name, auditId]) => {
      const audit = asObject(audits[auditId], `audit ${auditId}`);
      return [name, finiteNumber(audit.numericValue, `${auditId}.numericValue`)];
    }),
  ) as Record<keyof typeof METRIC_AUDITS, number>;

  return {
    ...values,
    performanceScore: finiteNumber(performance.score, "performance.score"),
  };
};

const aggregateValues = (name: LighthouseMetricName, values: number[]): MetricRange => {
  if (values.length < 2 || values.length > 3) {
    throw new Error(`Lighthouse requires 2 or 3 successful runs, received ${values.length}`);
  }
  const sorted = [...values].sort((left, right) => left - right);
  const low = sorted[0] ?? 0;
  const high = sorted.at(-1) ?? 0;
  return {
    value: sorted.length === 3 ? (sorted[1] ?? 0) : worseOf(name, low, high),
    min: low,
    max: high,
  };
};

/**
 * 진단 문구는 LHCI가 고른 대표 실행 한 건에서만 읽는다. 서로 다른 실행의 audit를 합치면
 * 함께 발생하지 않은 원인 후보가 한 결과처럼 보일 수 있다.
 */
const diagnosticsFrom = (report: unknown): LighthouseDiagnostic[] => {
  const audits = asObject(asObject(report, "report").audits, "audits");
  return DIAGNOSTIC_AUDITS.flatMap((id) => {
    const raw = audits[id];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return [];
    const audit = raw as Record<string, unknown>;
    if (typeof audit.title !== "string" || !audit.title.trim()) return [];

    const result: LighthouseDiagnostic = { id, title: audit.title.slice(0, 200) };
    if (typeof audit.numericValue === "number" && Number.isFinite(audit.numericValue)) {
      result.numericValue = audit.numericValue;
    }
    if (typeof audit.displayValue === "string")
      result.displayValue = audit.displayValue.slice(0, 200);
    return [result];
  }).slice(0, 5);
};

/**
 * 세 실행은 metric별 중앙값을 사용한다. 한 번 실패해 두 값만 남으면 회귀를 낙관하지 않도록
 * 더 나쁜 값을 사용하고 partial로 표시한다.
 * 어느 쪽이 나쁜지는 metric마다 다르므로 `metric-descriptor`가 답한다.
 */
const summarizeLighthouseRuns = (runs: LighthouseRun[]): LighthouseTargetResult[] => {
  const grouped = Map.groupBy(runs, (run) => run.url);
  return [...grouped.entries()].map(([url, urlRuns]) => {
    if (urlRuns.length < 2 || urlRuns.length > 3) {
      throw new Error(`Lighthouse ${url} requires 2 or 3 successful runs`);
    }
    const representative = urlRuns.filter((run) => run.isRepresentativeRun);
    if (representative.length !== 1) {
      throw new Error(`Lighthouse ${url} must have exactly one representative run`);
    }
    const runMetrics = urlRuns.map((run) => metricValues(run.report));
    const metricNames = Object.keys(runMetrics[0] ?? {}) as LighthouseMetricName[];
    const metrics = Object.fromEntries(
      metricNames.map((name) => [
        name,
        aggregateValues(
          name,
          runMetrics.map((item) => item[name]),
        ),
      ]),
    ) as Record<LighthouseMetricName, MetricRange>;

    return {
      url,
      status: urlRuns.length === 3 ? "ok" : "partial",
      runCount: urlRuns.length,
      metrics,
      diagnostics: diagnosticsFrom(representative[0]?.report),
    };
  });
};

export { aggregateValues, diagnosticsFrom, metricValues, summarizeLighthouseRuns };
export type { LighthouseTargetResult };
