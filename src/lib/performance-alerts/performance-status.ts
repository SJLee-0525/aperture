type PerformanceStatus = "good" | "needs_improvement" | "poor";
type FieldMetricName = "LCP" | "INP" | "CLS";
type LabMetricName = "LCP" | "CLS" | "performanceScore" | "TBT";

type FieldMetricInput = {
  metric: FieldMetricName;
  value: number;
  collectionPeriod: string;
};

type PreviousFieldMetric = FieldMetricInput & { status: PerformanceStatus };

type FieldJudgement = FieldMetricInput & {
  kind: "field";
  status: PerformanceStatus;
  previousValue: number | null;
  change: number | null;
  comparison: "newer" | "same_period" | "older_period" | "cold_start";
  alert: "regression" | "poor_entry" | null;
};

type LabInput = {
  lcp: number;
  cls: number;
  performanceScore: number;
  tbt: number;
};

type LabAlert = {
  metric: LabMetricName;
  reason: "threshold" | "regression";
  value: number;
  previousValue: number | null;
  changeRatio: number | null;
};

type LabJudgement = {
  kind: "lab";
  alerts: LabAlert[];
};

type InsufficientDataReason = "record_missing" | "metric_missing";
type InsufficientDataJudgement = {
  kind: "insufficient_data";
  reason: InsufficientDataReason;
  consecutiveCount: number;
  alert: boolean;
};

const FIELD_THRESHOLDS: Record<FieldMetricName, { good: number; needsImprovement: number }> = {
  LCP: { good: 2_500, needsImprovement: 4_000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
};

const finiteNonNegative = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be non-negative`);
};

/** Google의 Core Web Vitals p75 경계를 포함값으로 적용한다. */
const performanceStatus = (metric: FieldMetricName, value: number): PerformanceStatus => {
  finiteNonNegative(value, metric);
  const threshold = FIELD_THRESHOLDS[metric];
  if (value <= threshold.good) return "good";
  if (value <= threshold.needsImprovement) return "needs_improvement";
  return "poor";
};

const comparePeriod = (current: string, previous?: string): FieldJudgement["comparison"] => {
  if (!previous) return "cold_start";
  if (current === previous) return "same_period";
  return current > previous ? "newer" : "older_period";
};

const fieldChange = (metric: FieldMetricName, current: number, previous: number): number | null => {
  if (metric === "CLS") return current - previous;
  // 기준값이 0이면 증가율이 정의되지 않으므로 poor 첫 진입 여부만 판정한다.
  return previous === 0 ? null : (current - previous) / previous;
};

/**
 * CrUX field 값의 고정 상태와 회귀 여부를 함께 계산한다.
 * 같은 collection period와 과거 period는 새 사용자 표본이 아니므로 변화량을 만들지 않는다.
 */
const judgeFieldMetric = (
  current: FieldMetricInput,
  previous?: PreviousFieldMetric,
): FieldJudgement => {
  const status = performanceStatus(current.metric, current.value);
  const comparison = comparePeriod(current.collectionPeriod, previous?.collectionPeriod);
  const comparable = comparison === "newer" && previous !== undefined;
  const change = comparable ? fieldChange(current.metric, current.value, previous.value) : null;
  const regressed =
    status !== "good" &&
    change !== null &&
    (current.metric === "CLS" ? change >= 0.03 : change >= 0.15);
  const enteredPoor = comparable && status === "poor" && previous.status !== "poor";

  return {
    ...current,
    kind: "field",
    status,
    previousValue: comparable ? previous.value : null,
    change,
    comparison,
    alert: enteredPoor ? "poor_entry" : regressed ? "regression" : null,
  };
};

/** 데이터 부족은 최초와 4회 연속 시점에만 운영 메모 대상으로 만든다. */
const judgeInsufficientData = (
  reason: InsufficientDataReason,
  previousConsecutiveCount = 0,
): InsufficientDataJudgement => {
  if (!Number.isInteger(previousConsecutiveCount) || previousConsecutiveCount < 0) {
    throw new Error("previousConsecutiveCount must be a non-negative integer");
  }
  const consecutiveCount = previousConsecutiveCount + 1;
  return {
    kind: "insufficient_data",
    reason,
    consecutiveCount,
    // 매 실행 알림은 표본 부족 상태를 장애처럼 보이게 하므로 최초와 장기 지속 시점만 알린다.
    alert: consecutiveCount === 1 || consecutiveCount === 4,
  };
};

const ratio = (current: number, previous?: number): number | null =>
  previous === undefined || previous === 0 ? null : (current - previous) / previous;

/**
 * Lighthouse의 고정 임계값과 직전 실행 대비 회귀를 분리해 남긴다.
 * field INP와 lab TBT는 의미가 다르므로 서로 대체하거나 비교하지 않는다.
 */
const judgeLab = (current: LabInput, previous?: LabInput): LabJudgement => {
  Object.entries(current).forEach(([name, value]) => finiteNonNegative(value, name));
  const alerts: LabAlert[] = [];
  const addThreshold = (metric: LabMetricName, value: number, failed: boolean) => {
    if (failed)
      alerts.push({ metric, reason: "threshold", value, previousValue: null, changeRatio: null });
  };

  addThreshold("LCP", current.lcp, current.lcp > 3_000);
  addThreshold("CLS", current.cls, current.cls > 0.1);
  addThreshold("performanceScore", current.performanceScore, current.performanceScore < 0.8);

  (["lcp", "tbt"] as const).forEach((name) => {
    const changeRatio = ratio(current[name], previous?.[name]);
    if (changeRatio !== null && changeRatio >= 0.2) {
      alerts.push({
        metric: name === "lcp" ? "LCP" : "TBT",
        reason: "regression",
        value: current[name],
        previousValue: previous?.[name] ?? null,
        changeRatio,
      });
    }
  });
  return { kind: "lab", alerts };
};

export { judgeFieldMetric, judgeInsufficientData, judgeLab, performanceStatus };
