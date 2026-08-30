import type {
  DependencyScope,
  DependencySecurityFact,
  PriorityBand,
  Severity,
} from "@/lib/dependency-security/types";

const BAND_ORDER: Record<PriorityBand, number> = {
  immediate: 0,
  "this-week": 1,
  planned: 2,
  watch: 3,
};

const priorityFor = (severity: Severity, scope: DependencyScope): PriorityBand => {
  if (severity === "critical" || (severity === "high" && scope === "runtime")) return "immediate";
  if (severity === "high" || (severity === "medium" && scope === "runtime")) return "this-week";
  if (severity === "medium" || (severity === "low" && scope === "runtime")) return "planned";
  return "watch";
};

/** 생성 시각이 미래이거나 파싱되지 않으면 신규 alert로 집계하지 않는다. */
const isNewAlert = (createdAt: string, now: Date): boolean => {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  const age = now.getTime() - created;
  return age >= 0 && age <= 7 * 24 * 60 * 60 * 1_000;
};

/** LLM 분석 상한을 넘을 때 긴급 구간과 EPSS가 높은 alert를 먼저 남긴다. */
const sortForTriage = (facts: DependencySecurityFact[]): DependencySecurityFact[] =>
  [...facts].sort(
    (a, b) =>
      BAND_ORDER[a.priority] - BAND_ORDER[b.priority] ||
      (b.epssPercentage ?? -1) - (a.epssPercentage ?? -1) ||
      a.alertNumber - b.alertNumber,
  );

export { isNewAlert, priorityFor, sortForTriage };
