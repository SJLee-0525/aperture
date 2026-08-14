import {
  buildChatResponseSchema,
  createStreamingContentCollector,
  parseOrSalvageChatResult,
} from "@/features/chat/_lib/chat-response-contract";
import { MAX_OUTPUT_TOKENS } from "@/features/chat/_lib/chat-tuning";
import {
  assertUpstreamResponseOk,
  ChatUpstreamError,
} from "@/features/chat/_lib/chat-upstream-error";
import { readSseStream } from "@/features/chat/_lib/sse-stream";

import type { ChatProvider } from "@/features/chat/_lib/chat-provider";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const PROVIDER_LABEL = "Gemini";
/**
 * Gemini 전용 — OpenAI Responses API 의 추론 모델은 temperature 를 받지 않으므로
 * 공용 튜닝(chat-tuning.ts)으로 올리지 않는다.
 */
const TEMPERATURE = 0.4;

/**
 * thinkingConfig 는 의도적으로 보내지 않는다.
 * 사고 토큰이 maxOutputTokens 를 잠식하는 건 맞지만, 이를 끄는 필드가 모델 세대마다 다르다
 * (2.5 = thinkingConfig.thinkingBudget, 3.x = thinkingConfig.thinkingLevel).
 * 어느 쪽을 하드코딩해도 다른 세대 모델로 바꾸는 순간 400 이 나므로,
 * env 로 모델을 자유롭게 교체한다는 목표와 충돌한다.
 * gemini-3.5-flash-lite 는 기본값이 이미 최저치("minimal")이고 3.x 는 완전 차단도 불가능해
 * 명시해서 얻는 이득이 없다. 잘림은 넉넉한 MAX_OUTPUT_TOKENS 로 예방한다.
 */
const RESPONSE_SCHEMA = buildChatResponseSchema({ strict: false });

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
 * 안전 차단은 Gemini 만 신호를 준다 — OpenAI 에는 대응 신호가 없어 blocked 는 이 제공자 전용이다.
 * MAX_TOKENS 종료는 오류로 다루지 않는다. 잘린 JSON 은 공용 salvage 가 본문만 회수하므로
 * OpenAI 와 동일하게 "본문 확정 + links/references 포기"로 수렴한다.
 *
 * @param {GeminiResponse} data
 * @returns {void}
 */
const assertNotBlocked = (data: GeminiResponse) => {
  const candidate = data.candidates?.[0];
  if (data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") {
    throw new ChatUpstreamError("blocked", "Gemini response was blocked");
  }
};

const createGeminiChatProvider =
  (apiKey: string, model: string): ChatProvider =>
  async ({ instructions, messages, signal, onContentDelta }) => {
    const method = onContentDelta ? "streamGenerateContent?alt=sse" : "generateContent";
    const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      }),
      signal,
    });

    assertUpstreamResponseOk(PROVIDER_LABEL, response);

    if (onContentDelta) {
      const collector = createStreamingContentCollector(onContentDelta);
      await readSseStream(response, signal, (payload) => {
        const data = JSON.parse(payload) as GeminiResponse;
        assertNotBlocked(data);
        collector.push(responseText(data));
      });
      return parseOrSalvageChatResult(collector.serialized.trim());
    }

    const data = (await response.json()) as GeminiResponse;
    assertNotBlocked(data);
    const text = responseText(data).trim();
    if (!text) throw new ChatUpstreamError("invalid", "Gemini returned no content");
    return parseOrSalvageChatResult(text);
  };

export { createGeminiChatProvider };
