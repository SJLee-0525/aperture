import type { TriageContract, TriageProvider } from "@/lib/triage/contract";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** 판정 일관성을 위해 챗봇(0.4)보다 낮춘다. 같은 입력에 매번 다른 판정이 나오면 쓸모가 없다. */
const TEMPERATURE = 0.2;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

const responseText = (data: GeminiResponse): string =>
  data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

/**
 * generateContent 어댑터. 키는 query 에 남지 않도록 `x-goog-api-key` 헤더로 보낸다.
 *
 * `thinkingConfig` 는 보내지 않는다. 사고 예산을 끄는 필드가 모델 세대마다 달라
 * (2.5 = thinkingBudget, 3.x = thinkingLevel) 어느 쪽을 넣어도 env 로 모델을 바꾸는 순간
 * 400 이 난다. `gemini-chat-provider.ts` 와 같은 판단이다.
 *
 * 안전 차단은 빈 텍스트로 돌아와 파싱 실패와 구분되지 않으므로 먼저 확인해 사유를 남긴다.
 */
const createGeminiAdapter =
  <In, Out>(
    contract: TriageContract<In, Out>,
    apiKey: string,
    model: string,
    fetcher: typeof fetch,
  ): TriageProvider<In, Out> =>
  async (request, signal) => {
    const response = await fetcher(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: contract.instructions }] },
          contents: [{ role: "user", parts: [{ text: contract.buildInput(request) }] }],
          generationConfig: {
            temperature: TEMPERATURE,
            maxOutputTokens: contract.outputTokens(request),
            responseMimeType: "application/json",
            responseJsonSchema: contract.schema(false),
          },
        }),
        signal,
      },
    );
    if (!response.ok) {
      throw new Error(`Gemini ${contract.schemaName} request failed (${response.status})`);
    }

    const data = (await response.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error(`Gemini blocked the ${contract.schemaName} response`);
    }

    const result = contract.parse(responseText(data).trim(), request);
    if (!result) {
      throw new Error(`Gemini returned an unusable ${contract.schemaName} result`);
    }
    return { result, provider: "gemini", model };
  };

export { createGeminiAdapter };
