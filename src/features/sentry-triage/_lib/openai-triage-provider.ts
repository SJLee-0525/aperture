import { buildTriageInput, TRIAGE_INSTRUCTIONS } from "@/features/sentry-triage/_lib/triage-prompt";
import { buildTriageSchema, parseTriageResult } from "@/features/sentry-triage/_lib/triage-schema";

import type { TriageProvider } from "@/features/sentry-triage/_lib/triage-provider";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

/**
 * 챗봇은 `none` 을 쓴다. 트리아지는 스택을 읽고 원인을 추정해야 해서 최소한의 추론을 남긴다.
 * 추론 토큰이 `max_output_tokens` 를 함께 소모하므로 출력 예산을 넉넉히 잡는다.
 */
const REASONING_EFFORT = "low";
const MAX_OUTPUT_TOKENS = 1_500;

/** Responses API 의 추론 모델은 temperature 를 받지 않는다 (`chat-tuning.ts` 기록). */
const RESPONSE_SCHEMA = buildTriageSchema({ strict: true });

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

const responseOutputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

const createOpenAITriageProvider =
  (apiKey: string, model: string): TriageProvider =>
  async ({ summary, signal }) => {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: TRIAGE_INSTRUCTIONS,
        input: [{ role: "user", content: buildTriageInput(summary) }],
        reasoning: { effort: REASONING_EFFORT },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "sentry_triage",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
      signal,
    });

    if (!response.ok) throw new Error(`OpenAI triage failed (${response.status})`);

    const data = (await response.json()) as OpenAIResponse;
    const result = parseTriageResult(responseOutputText(data).trim());
    if (!result)
      throw new Error(data.error?.message ?? "OpenAI returned an unusable triage result");
    return { result, provider: "openai", model };
  };

export { createOpenAITriageProvider };
