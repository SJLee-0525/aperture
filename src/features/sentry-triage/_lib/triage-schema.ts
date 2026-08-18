import type { TriageConfidence, TriageResult, TriageSeverity } from "@/types/sentry-alert";

const SEVERITIES: readonly TriageSeverity[] = ["critical", "high", "medium", "low"];
const CONFIDENCES: readonly TriageConfidence[] = ["high", "medium", "low"];

/** 카드의 조치 field 하나에 들어갈 수 있는 분량. 넘치면 어차피 잘린다. */
const MAX_ACTIONS = 4;

/**
 * 두 제공자가 같은 출력 계약을 쓰도록 한 곳에서 만든다.
 * OpenAI Structured Outputs(strict) 는 모든 object 에 `additionalProperties: false` 를 요구하고
 * Gemini `responseJsonSchema` 는 이 키를 받지 않으므로 strict 플래그로만 분기한다
 * (`chat-response-contract.ts` 와 같은 이유).
 */
const buildTriageSchema = ({ strict }: { strict: boolean }) => ({
  type: "object",
  ...(strict ? { additionalProperties: false } : {}),
  properties: {
    severity: {
      type: "string",
      enum: [...SEVERITIES],
      description:
        "critical: visitors cannot use a core path or data is corrupted. high: a screen or feature is broken with no workaround. medium: degraded but workable. low: one-off or external with little visitor impact.",
    },
    isNoise: {
      type: "boolean",
      description:
        "True only when the event is not ours to fix: browser extensions, third-party scripts, or requests the user cancelled.",
    },
    userImpact: {
      type: "string",
      description: "What a visitor actually experiences, in one Korean sentence.",
    },
    probableCause: {
      type: "string",
      description: "The most likely cause based on the stack, in Korean.",
    },
    suspectArea: {
      type: "string",
      description:
        "The file or function to open first. Empty string when the stack has no app frame.",
    },
    recommendedActions: {
      type: "array",
      maxItems: MAX_ACTIONS,
      items: { type: "string" },
      description:
        "Two to four concrete steps in Korean: a file to read, a condition to reproduce, a value to check. Never generic advice such as improving monitoring.",
    },
    confidence: { type: "string", enum: [...CONFIDENCES] },
  },
  required: [
    "severity",
    "isNoise",
    "userImpact",
    "probableCause",
    "suspectArea",
    "recommendedActions",
    "confidence",
  ],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * 제공자 응답을 판정 결과로 읽는다.
 *
 * 일부 필드만 살려 쓰지 않는다. 심각도나 원인이 빠진 값을 통과시키면 카드가 잘못된 심각도를
 * 표시한다. 계약을 어긴 응답은 null 로 돌려주고 호출자가 판정 없는 기본 카드를 보낸다.
 *
 * @param text 제공자가 돌려준 JSON 문자열.
 * @returns 계약을 만족하면 판정 결과, 아니면 null.
 */
const parseTriageResult = (text: string): TriageResult | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const severity = parsed.severity;
  const confidence = parsed.confidence;
  if (!SEVERITIES.includes(severity as TriageSeverity)) return null;
  if (!CONFIDENCES.includes(confidence as TriageConfidence)) return null;
  if (typeof parsed.isNoise !== "boolean") return null;

  const userImpact = asText(parsed.userImpact);
  const probableCause = asText(parsed.probableCause);
  if (!userImpact || !probableCause) return null;

  const recommendedActions = Array.isArray(parsed.recommendedActions)
    ? parsed.recommendedActions.map(asText).filter(Boolean).slice(0, MAX_ACTIONS)
    : [];

  return {
    severity: severity as TriageSeverity,
    isNoise: parsed.isNoise,
    userImpact,
    probableCause,
    suspectArea: asText(parsed.suspectArea),
    recommendedActions,
    confidence: confidence as TriageConfidence,
  };
};

export { buildTriageSchema, MAX_ACTIONS, parseTriageResult };
