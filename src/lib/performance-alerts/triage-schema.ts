type PerformanceTriageConfidence = "high" | "medium" | "low";
type PerformanceTriageTarget = {
  targetIndex: number;
  summary: string;
  userImpact: string;
  likelyCauses: string[];
  inspectFirst: string[];
  recommendedChecks: string[];
  confidence: PerformanceTriageConfidence;
};
type PerformanceTriageResult = {
  commonSummary: string;
  commonCauses: string[];
  targets: PerformanceTriageTarget[];
};

const CONFIDENCES: readonly PerformanceTriageConfidence[] = ["high", "medium", "low"];
const MAX_TEXT = 300;
const MAX_ITEMS = 4;
const MAX_ITEM_TEXT = 200;
const MAX_TARGETS = 20;

const TARGET_KEYS = [
  "targetIndex",
  "summary",
  "userImpact",
  "likelyCauses",
  "inspectFirst",
  "recommendedChecks",
  "confidence",
] as const;
const RESULT_KEYS = ["commonSummary", "commonCauses", "targets"] as const;

const itemArray = () => ({
  type: "array",
  maxItems: MAX_ITEMS,
  items: { type: "string", maxLength: MAX_ITEM_TEXT },
});

/** OpenAI strict schema만 additionalProperties를 요구하므로 provider별 차이는 이 경계에 한정한다. */
const buildPerformanceTriageSchema = ({ strict }: { strict: boolean }) => {
  const closed = strict ? { additionalProperties: false } : {};
  return {
    type: "object",
    ...closed,
    properties: {
      commonSummary: { type: "string", maxLength: MAX_TEXT },
      commonCauses: itemArray(),
      targets: {
        type: "array",
        maxItems: MAX_TARGETS,
        items: {
          type: "object",
          ...closed,
          properties: {
            targetIndex: { type: "integer", minimum: 0 },
            summary: { type: "string", maxLength: MAX_TEXT },
            userImpact: { type: "string", maxLength: MAX_TEXT },
            likelyCauses: itemArray(),
            inspectFirst: itemArray(),
            recommendedChecks: itemArray(),
            confidence: { type: "string", enum: [...CONFIDENCES] },
          },
          required: [...TARGET_KEYS],
        },
      },
    },
    required: [...RESULT_KEYS],
  };
};

const text = (value: unknown, limit: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= limit ? normalized : null;
};

const textArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
  const parsed = value.map((item) => text(item, MAX_ITEM_TEXT));
  return parsed.every((item): item is string => item !== null) ? parsed : null;
};

const record = (value: unknown, allowed: readonly string[]): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = value as Record<string, unknown>;
  return Object.keys(entries).some((key) => !allowed.includes(key)) ? null : entries;
};

const parseTarget = (value: unknown, expectedTargets: number): PerformanceTriageTarget | null => {
  const entries = record(value, TARGET_KEYS);
  if (!entries) return null;
  const targetIndex = entries.targetIndex;
  if (
    !Number.isInteger(targetIndex) ||
    (targetIndex as number) < 0 ||
    (targetIndex as number) >= expectedTargets
  ) {
    return null;
  }
  const summary = text(entries.summary, MAX_TEXT);
  const userImpact = text(entries.userImpact, MAX_TEXT);
  const likelyCauses = textArray(entries.likelyCauses);
  const inspectFirst = textArray(entries.inspectFirst);
  const recommendedChecks = textArray(entries.recommendedChecks);
  if (
    !summary ||
    !userImpact ||
    !likelyCauses ||
    !inspectFirst ||
    !recommendedChecks ||
    !CONFIDENCES.includes(entries.confidence as PerformanceTriageConfidence)
  ) {
    return null;
  }
  return {
    targetIndex: targetIndex as number,
    summary,
    userImpact,
    likelyCauses,
    inspectFirst,
    recommendedChecks,
    confidence: entries.confidence as PerformanceTriageConfidence,
  };
};

/**
 * 계약을 일부만 복구하지 않는다. 대상이 하나라도 빠지거나 겹치면 전체를 버려
 * 한 대상의 분석이 다른 대상에 붙는 상태를 만들지 않는다.
 *
 * @param expectedTargets 요청에 넣은 대상 수. 반환 targets는 이 순서로 정렬된다.
 */
const parsePerformanceTriageResult = (
  value: string,
  expectedTargets: number,
): PerformanceTriageResult | null => {
  if (expectedTargets < 1 || expectedTargets > MAX_TARGETS) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  const entries = record(parsed, RESULT_KEYS);
  if (!entries) return null;
  const commonSummary = text(entries.commonSummary, MAX_TEXT);
  const commonCauses = textArray(entries.commonCauses);
  if (!commonSummary || !commonCauses) return null;
  if (!Array.isArray(entries.targets) || entries.targets.length !== expectedTargets) return null;
  const targets = entries.targets.map((target) => parseTarget(target, expectedTargets));
  if (!targets.every((target): target is PerformanceTriageTarget => target !== null)) return null;
  const seen = new Set(targets.map((target) => target.targetIndex));
  if (seen.size !== expectedTargets) return null;
  return {
    commonSummary,
    commonCauses,
    targets: [...targets].sort((left, right) => left.targetIndex - right.targetIndex),
  };
};

export { buildPerformanceTriageSchema, MAX_TARGETS, parsePerformanceTriageResult };
export type { PerformanceTriageConfidence, PerformanceTriageResult, PerformanceTriageTarget };
