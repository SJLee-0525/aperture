import { buildTriageInput, TRIAGE_INSTRUCTIONS } from "@/features/sentry-triage/_lib/triage-prompt";
import { buildTriageSchema, parseTriageResult } from "@/features/sentry-triage/_lib/triage-schema";

import type { TriageProvider } from "@/features/sentry-triage/_lib/triage-provider";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** 판정 일관성을 위해 챗봇(0.4)보다 낮춘다. 같은 오류에 매번 다른 심각도가 나오면 쓸모가 없다. */
const TEMPERATURE = 0.2;
const MAX_OUTPUT_TOKENS = 1_500;

/**
 * `thinkingConfig` 는 보내지 않는다. 사고 예산을 끄는 필드가 모델 세대마다 달라
 * (2.5 = thinkingBudget, 3.x = thinkingLevel) 어느 쪽을 넣어도 env 로 모델을 바꾸는 순간
 * 400 이 난다. `gemini-chat-provider.ts` 와 같은 판단이다.
 */
const RESPONSE_SCHEMA = buildTriageSchema({ strict: false });

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

const responseText = (data: GeminiResponse): string =>
  data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

const createGeminiTriageProvider =
  (apiKey: string, model: string): TriageProvider =>
  async ({ summary, signal }) => {
    const response = await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TRIAGE_INSTRUCTIONS }] },
          contents: [{ role: "user", parts: [{ text: buildTriageInput(summary) }] }],
          generationConfig: {
            temperature: TEMPERATURE,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
            responseJsonSchema: RESPONSE_SCHEMA,
          },
        }),
        signal,
      },
    );

    if (!response.ok) throw new Error(`Gemini triage failed (${response.status})`);

    const data = (await response.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error("Gemini blocked the triage response");
    }

    const result = parseTriageResult(responseText(data).trim());
    if (!result) throw new Error("Gemini returned an unusable triage result");
    return { result, provider: "gemini", model };
  };

export { createGeminiTriageProvider };
