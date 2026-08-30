import type { DependencyScope, PriorityBand, Severity } from "@/lib/dependency-security/types";

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

export { isNewAlert, priorityFor };
