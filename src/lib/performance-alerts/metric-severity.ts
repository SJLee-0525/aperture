import { describeMetric, severityRatio } from "@/lib/performance-alerts/metric-descriptor";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";

type TriageMetric = PerformanceTriageInput["metrics"][number];

/** 등급, 악화 크기, 결정론적 tie-break 순으로 비교하는 내림차순 키. */
type SeverityKey = {
  statusRank: number;
  severity: number;
  sourceRank: number;
  knownRank: number;
  name: string;
};

// 모델이 새 상태 문자열을 보내도 알려진 세 등급보다 아래에 둔다.
const STATUS_RANK: Record<string, number> = {
  poor: 3,
  needs_improvement: 2,
  good: 1,
};

const metricSeverityKey = (metric: TriageMetric): SeverityKey => ({
  statusRank: STATUS_RANK[metric.status] ?? 0,
  severity:
    metric.previous === null
      ? 0
      : (severityRatio(metric.metric, metric.current, metric.previous) ?? 0),
  sourceRank: metric.source === "lab" ? 1 : 0,
  knownRank: describeMetric(metric.metric) ? 1 : 0,
  name: metric.metric,
});

const compareKeys = (left: SeverityKey, right: SeverityKey): number =>
  right.statusRank - left.statusRank ||
  right.severity - left.severity ||
  right.sourceRank - left.sourceRank ||
  right.knownRank - left.knownRank ||
  left.name.localeCompare(right.name);

const compareMetricSeverity = (left: TriageMetric, right: TriageMetric): number =>
  compareKeys(metricSeverityKey(left), metricSeverityKey(right));

/**
 * 경고를 만든 핵심 metric이 앞에 오도록 정렬한 새 배열을 만든다.
 * 모르는 metric은 뒤로 보내되 버리지 않는다. 새 metric이 모델 입력에서 사라지면 안 된다.
 * 원래 인덱스가 마지막 tie-break라 런타임 정렬의 안정성과 무관하게 결과가 같다.
 */
const rankMetrics = (metrics: TriageMetric[]): TriageMetric[] =>
  metrics
    .map((metric, index) => ({ metric, index, key: metricSeverityKey(metric) }))
    .sort((left, right) => compareKeys(left.key, right.key) || left.index - right.index)
    .map((item) => item.metric);

/** 대상 사이의 순위. 그 대상에서 가장 심각한 metric의 키를 쓴다. */
const targetSeverityKey = (input: PerformanceTriageInput): SeverityKey => {
  const ranked = rankMetrics(input.metrics)[0];
  return ranked
    ? { ...metricSeverityKey(ranked), name: input.target }
    : { statusRank: 0, severity: 0, sourceRank: 0, knownRank: 0, name: input.target };
};

const compareTargetSeverity = (
  left: PerformanceTriageInput,
  right: PerformanceTriageInput,
): number => compareKeys(targetSeverityKey(left), targetSeverityKey(right));

export { compareMetricSeverity, compareTargetSeverity, rankMetrics, targetSeverityKey };
