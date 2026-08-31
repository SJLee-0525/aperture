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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const RESPONSE_SCHEMA = buildPerformanceTriageSchema({ strict: false });

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
};

/** Gemini key는 query에 남기지 않고 header로 보내며 JSON schema 응답만 허용한다. */
const createGeminiPerformanceTriageProvider =
  (apiKey: string, model: string, request: typeof fetch = fetch): PerformanceTriageProvider =>
  async ({ inputs, signal }) => {
    const response = await request(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PERFORMANCE_TRIAGE_INSTRUCTIONS }] },
          contents: [{ role: "user", parts: [{ text: buildPerformanceTriageInput(inputs) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: performanceTriageOutputTokens(inputs.length),
            responseMimeType: "application/json",
            responseJsonSchema: RESPONSE_SCHEMA,
          },
        }),
        signal,
      },
    );
    if (!response.ok) throw new Error(`Gemini performance triage failed (${response.status})`);
    const data = (await response.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error("Gemini blocked the performance triage response");
    }
    const text =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const result = parsePerformanceTriageResult(text, inputs.length);
    if (!result) throw new Error("Gemini returned an unusable performance triage result");
    return { result, provider: "gemini", model };
  };

export { createGeminiPerformanceTriageProvider };
