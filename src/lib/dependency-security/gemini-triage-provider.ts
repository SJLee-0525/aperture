import { buildTriageInput, INSTRUCTIONS } from "@/lib/dependency-security/triage-prompt";
import { parseTriageResults, schemaFor } from "@/lib/dependency-security/triage-schema";

import type { DependencyTriageProvider } from "@/lib/dependency-security/triage-provider";

type ResponseBody = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

/** 모델별 사고 예산 필드가 달라 env 모델 교체를 막으므로 thinkingConfig는 보내지 않는다. */
const createGeminiProvider =
  (apiKey: string, model: string): DependencyTriageProvider =>
  async ({ facts, signal }) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
          contents: [{ role: "user", parts: [{ text: buildTriageInput(facts) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 3_000,
            responseMimeType: "application/json",
            responseJsonSchema: schemaFor(false),
          },
        }),
        signal,
      },
    );
    if (!response.ok) throw new Error(`Gemini dependency triage failed (${response.status})`);
    const body = (await response.json()) as ResponseBody;
    const text =
      body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const results = parseTriageResults(text);
    if (!results) throw new Error("Gemini returned an unusable dependency triage result");
    return { results, provider: "gemini", model };
  };

export { createGeminiProvider };
