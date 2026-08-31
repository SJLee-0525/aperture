import { compareTargetSeverity } from "@/lib/performance-alerts/metric-severity";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";

type TriageSelection = {
  selected: PerformanceTriageInput[];
  omitted: number;
};

/**
 * AI에 넘길 대상을 심각도 순으로 상한까지만 고른다.
 * 반환 순서가 provider 요청 순서이며 응답의 targetIndex와 카드 순서가 모두 여기에 맞춰진다.
 * 잘라내는 지점을 여기 하나로 모아야 파서의 expectedTargets가 요청 수와 어긋나지 않는다.
 */
const selectTriageTargets = (inputs: PerformanceTriageInput[], limit: number): TriageSelection => {
  const size = Math.max(0, limit);
  // 심각도가 완전히 같은 대상은 원래 순서를 지켜 실행마다 같은 결과를 만든다.
  const ranked = inputs
    .map((input, index) => ({ input, index }))
    .sort(
      (left, right) => compareTargetSeverity(left.input, right.input) || left.index - right.index,
    )
    .map((item) => item.input);
  return { selected: ranked.slice(0, size), omitted: Math.max(0, ranked.length - size) };
};

export { selectTriageTargets };
export type { TriageSelection };
