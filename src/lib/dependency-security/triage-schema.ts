type DependencyTriageResult = {
  alertNumber: number;
  impact: string;
  priorityReason: string;
  recommendedChecks: string[];
  confidence: "high" | "medium" | "low";
};

const strictSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          alertNumber: { type: "integer" },
          impact: { type: "string", maxLength: 300 },
          priorityReason: { type: "string", maxLength: 300 },
          recommendedChecks: {
            type: "array",
            items: { type: "string", maxLength: 200 },
            maxItems: 3,
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["alertNumber", "impact", "priorityReason", "recommendedChecks", "confidence"],
      },
    },
  },
  required: ["results"],
} as const;

/** Gemini가 받지 않는 OpenAI 전용 additionalProperties 계약만 제공자별로 제거한다. */
const schemaFor = (strict: boolean): Record<string, unknown> => {
  const copy = structuredClone(strictSchema) as Record<string, unknown>;
  if (strict) return copy;
  const removeAdditionalProperties = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(removeAdditionalProperties);
    if (typeof value !== "object" || value === null) return;
    delete (value as Record<string, unknown>).additionalProperties;
    Object.values(value).forEach(removeAdditionalProperties);
  };
  removeAdditionalProperties(copy);
  return copy;
};

const MAX_TEXT = 300;
const MAX_CHECK_TEXT = 200;
const MAX_CHECKS = 3;

/**
 * 공백을 제거한 뒤 길이를 재고 빈 문자열은 거부한다. provider schema 는 maxLength 만 두고
 * minLength 가 없어 빈 값이 통과하는데, 빈 impact 는 카드에 빈 줄로 렌더된다.
 */
const text = (value: unknown, limit: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= limit ? normalized : null;
};

const checks = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length > MAX_CHECKS) return null;
  const parsed = value.map((item) => text(item, MAX_CHECK_TEXT));
  return parsed.every((item): item is string => item !== null) ? parsed : null;
};

const parseResult = (value: unknown): DependencyTriageResult | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = value as Record<string, unknown>;
  const impact = text(entries.impact, MAX_TEXT);
  const priorityReason = text(entries.priorityReason, MAX_TEXT);
  const recommendedChecks = checks(entries.recommendedChecks);
  const confidence = entries.confidence;
  if (
    !Number.isInteger(entries.alertNumber) ||
    !impact ||
    !priorityReason ||
    !recommendedChecks ||
    typeof confidence !== "string" ||
    !["high", "medium", "low"].includes(confidence)
  ) {
    return null;
  }
  return {
    alertNumber: entries.alertNumber as number,
    impact,
    priorityReason,
    recommendedChecks,
    confidence: confidence as DependencyTriageResult["confidence"],
  };
};

/**
 * 결과는 alertNumber 로 alert 에 붙으므로 어긋난 항목만 버리고 나머지는 그대로 쓴다.
 * 남는 항목이 없으면 null 을 돌려준다. 빈 배열은 푸터에 모델 이름을 적으면서 카드에는
 * 분석이 없는 상태를 만든다.
 */
const parseTriageResults = (raw: string): DependencyTriageResult[] | null => {
  try {
    const value = JSON.parse(raw) as { results?: unknown };
    if (!Array.isArray(value.results)) return null;
    const parsed = value.results.flatMap((item) => {
      const result = parseResult(item);
      return result ? [result] : [];
    });
    return parsed.length ? parsed : null;
  } catch {
    return null;
  }
};

export { parseTriageResults, schemaFor };
export type { DependencyTriageResult };
