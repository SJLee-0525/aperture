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

const parseTriageResults = (text: string): DependencyTriageResult[] | null => {
  try {
    const value = JSON.parse(text) as { results?: unknown };
    if (!Array.isArray(value.results)) return null;
    const valid = value.results.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        Number.isInteger((item as DependencyTriageResult).alertNumber) &&
        typeof (item as DependencyTriageResult).impact === "string" &&
        typeof (item as DependencyTriageResult).priorityReason === "string" &&
        Array.isArray((item as DependencyTriageResult).recommendedChecks) &&
        ["high", "medium", "low"].includes((item as DependencyTriageResult).confidence),
    );
    return valid ? (value.results as DependencyTriageResult[]) : null;
  } catch {
    return null;
  }
};

export { parseTriageResults, schemaFor };
export type { DependencyTriageResult };
