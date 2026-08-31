type MetricUnit = "ms" | "unitless" | "score";

type MetricDescriptor = {
  higherIsBetter: boolean;
  unit: MetricUnit;
  /**
   * 단위가 다른 metric을 한 줄에 세우기 위한 비교 척도이며 판정 임계값이 아니다.
   * 좋고 나쁨의 경계는 `performance-status.ts`가 단독으로 소유하고 그 값과 다르다.
   * field LCP 경계는 2,500ms인데 `judgeLab`의 lab 경계는 3,000ms이고 점수 경계는 0.8이다.
   */
  severityScale: number;
};

/**
 * field는 대문자 이름(`LCP`), lab은 소문자와 camel 이름(`lcp`, `performanceScore`)을 쓴다.
 * 두 이름 공간이 같은 metric을 가리키므로 소문자 키 하나로 모은다.
 */
const DESCRIPTORS: Record<string, MetricDescriptor> = {
  lcp: { higherIsBetter: false, unit: "ms", severityScale: 2_500 },
  inp: { higherIsBetter: false, unit: "ms", severityScale: 200 },
  cls: { higherIsBetter: false, unit: "unitless", severityScale: 0.1 },
  tbt: { higherIsBetter: false, unit: "ms", severityScale: 200 },
  fcp: { higherIsBetter: false, unit: "ms", severityScale: 1_800 },
  ttfb: { higherIsBetter: false, unit: "ms", severityScale: 800 },
  speedindex: { higherIsBetter: false, unit: "ms", severityScale: 3_400 },
  // 만점 1.0과 good 경계 0.9 사이의 폭이다.
  performancescore: { higherIsBetter: true, unit: "score", severityScale: 0.1 },
};

const describeMetric = (name: string): MetricDescriptor | null =>
  DESCRIPTORS[name.toLowerCase()] ?? null;

const finitePair = (left: number, right: number): boolean =>
  Number.isFinite(left) && Number.isFinite(right);

/**
 * 두 측정값 중 회귀를 낙관하지 않는 쪽을 고른다.
 * 모르는 metric은 큰 값을 고른다. Lighthouse metric 대부분이 클수록 나쁘다.
 */
const worseOf = (name: string, left: number, right: number): number => {
  const descriptor = describeMetric(name);
  if (descriptor?.higherIsBetter) return Math.min(left, right);
  return Math.max(left, right);
};

/** 방향을 보정한 악화량. 개선이거나 같으면 null. */
const worseningDelta = (name: string, current: number, previous: number): number | null => {
  const descriptor = describeMetric(name);
  if (!descriptor || !finitePair(current, previous)) return null;
  const delta = descriptor.higherIsBetter ? previous - current : current - previous;
  return delta > 0 ? delta : null;
};

/** 단위가 다른 metric을 비교하기 위한 무단위 악화 크기. 개선이면 null. */
const severityRatio = (name: string, current: number, previous: number): number | null => {
  const delta = worseningDelta(name, current, previous);
  const descriptor = describeMetric(name);
  if (delta === null || !descriptor) return null;
  return delta / descriptor.severityScale;
};

const UNIT_FRACTION_DIGITS: Record<MetricUnit, number> = {
  ms: 0,
  unitless: 3,
  score: 2,
};

/**
 * 표시용 변화량. 부호는 실제 변화 방향을 따르므로 점수 하락은 음수가 된다.
 * 정렬은 이 값이 아니라 `severityRatio`를 쓴다.
 */
const formatDelta = (name: string, current: number, previous: number): string => {
  const descriptor = describeMetric(name);
  const delta = current - previous;
  if (!Number.isFinite(delta)) return "변화 없음";
  const digits = descriptor ? UNIT_FRACTION_DIGITS[descriptor.unit] : 3;
  const suffix = descriptor?.unit === "ms" ? "ms" : "";
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(digits)}${suffix}`;
};

export { describeMetric, formatDelta, severityRatio, worseningDelta, worseOf };
export type { MetricDescriptor };
