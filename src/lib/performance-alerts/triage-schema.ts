type PerformanceTriageConfidence = "high" | "medium" | "low";
type PerformanceTriageResult = {
  summary: string;
  userImpact: string;
  likelyCauses: string[];
  inspectFirst: string[];
  recommendedChecks: string[];
  confidence: PerformanceTriageConfidence;
};

const CONFIDENCES: readonly PerformanceTriageConfidence[] = ["high", "medium", "low"];
const MAX_TEXT = 300;
const MAX_ITEMS = 4;
const MAX_ITEM_TEXT = 200;

/** OpenAI strict schema만 additionalProperties를 요구하므로 provider별 차이는 이 경계에 한정한다. */
const buildPerformanceTriageSchema = ({ strict }: { strict: boolean }) => ({
  type: "object",
  ...(strict ? { additionalProperties: false } : {}),
  properties: {
    summary: { type: "string", maxLength: MAX_TEXT },
    userImpact: { type: "string", maxLength: MAX_TEXT },
    likelyCauses: {
      type: "array",
      maxItems: MAX_ITEMS,
      items: { type: "string", maxLength: MAX_ITEM_TEXT },
    },
    inspectFirst: {
      type: "array",
      maxItems: MAX_ITEMS,
      items: { type: "string", maxLength: MAX_ITEM_TEXT },
    },
    recommendedChecks: {
      type: "array",
      maxItems: MAX_ITEMS,
      items: { type: "string", maxLength: MAX_ITEM_TEXT },
    },
    confidence: { type: "string", enum: [...CONFIDENCES] },
  },
  required: [
    "summary",
    "userImpact",
    "likelyCauses",
    "inspectFirst",
    "recommendedChecks",
    "confidence",
  ],
});

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

/** 계약을 일부만 복구하지 않는다. 잘못된 AI 응답은 원인 없는 기본 카드로 대체한다. */
const parsePerformanceTriageResult = (value: string): PerformanceTriageResult | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const allowed = [
    "summary",
    "userImpact",
    "likelyCauses",
    "inspectFirst",
    "recommendedChecks",
    "confidence",
  ];
  if (Object.keys(record).some((key) => !allowed.includes(key))) return null;
  const summary = text(record.summary, MAX_TEXT);
  const userImpact = text(record.userImpact, MAX_TEXT);
  const likelyCauses = textArray(record.likelyCauses);
  const inspectFirst = textArray(record.inspectFirst);
  const recommendedChecks = textArray(record.recommendedChecks);
  if (
    !summary ||
    !userImpact ||
    !likelyCauses ||
    !inspectFirst ||
    !recommendedChecks ||
    !CONFIDENCES.includes(record.confidence as PerformanceTriageConfidence)
  ) {
    return null;
  }
  return {
    summary,
    userImpact,
    likelyCauses,
    inspectFirst,
    recommendedChecks,
    confidence: record.confidence as PerformanceTriageConfidence,
  };
};

export { buildPerformanceTriageSchema, parsePerformanceTriageResult };
export type { PerformanceTriageResult };
