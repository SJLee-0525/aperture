import {
  buildPerformanceTriageInput,
  PERFORMANCE_TRIAGE_INSTRUCTIONS,
  performanceTriageOutputTokens,
} from "@/lib/performance-alerts/triage-prompt";
import {
  buildPerformanceTriageSchema,
  parsePerformanceTriageResult,
} from "@/lib/performance-alerts/triage-schema";

import type { PerformanceTriageProvider } from "@/lib/performance-alerts/triage-provider";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const RESPONSE_SCHEMA = buildPerformanceTriageSchema({ strict: true });

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

const outputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

/** Responses API에는 원시 측정 결과를 저장하지 않도록 store를 끈 strict JSON 요청만 보낸다. */
const createOpenAIPerformanceTriageProvider =
  (apiKey: string, model: string, request: typeof fetch = fetch): PerformanceTriageProvider =>
  async ({ inputs, signal }) => {
    const response = await request(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: PERFORMANCE_TRIAGE_INSTRUCTIONS,
        input: [{ role: "user", content: buildPerformanceTriageInput(inputs) }],
        reasoning: { effort: "low" },
        max_output_tokens: performanceTriageOutputTokens(inputs.length),
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "performance_triage",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
      signal,
    });
    if (!response.ok) throw new Error(`OpenAI performance triage failed (${response.status})`);
    const result = parsePerformanceTriageResult(
      outputText((await response.json()) as OpenAIResponse),
      inputs.length,
    );
    if (!result) throw new Error("OpenAI returned an unusable performance triage result");
    return { result, provider: "openai", model };
  };

export { createOpenAIPerformanceTriageProvider };
