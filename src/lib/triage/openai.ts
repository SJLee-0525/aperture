import type { TriageContract, TriageProvider } from "@/lib/triage/contract";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

/**
 * 챗봇은 `none` 을 쓴다. 트리아지는 근거를 읽고 원인을 추정해야 해서 최소한의 추론을
 * 남긴다. 추론 토큰이 `max_output_tokens` 를 함께 소모하므로 계약의 출력 예산은
 * 그 몫까지 포함해야 한다.
 */
const REASONING_EFFORT = "low";

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

const outputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

/**
 * Responses API 어댑터. 판정 입력을 저장하지 않도록 `store` 를 끄고 strict JSON schema
 * 출력만 허용한다. 추론 모델은 temperature 를 받지 않는다 (`chat-tuning.ts` 기록).
 */
const createOpenAIAdapter =
  <In, Out>(
    contract: TriageContract<In, Out>,
    apiKey: string,
    model: string,
    fetcher: typeof fetch,
  ): TriageProvider<In, Out> =>
  async (request, signal) => {
    const response = await fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: contract.instructions,
        input: [{ role: "user", content: contract.buildInput(request) }],
        reasoning: { effort: REASONING_EFFORT },
        max_output_tokens: contract.outputTokens(request),
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: contract.schemaName,
            strict: true,
            schema: contract.schema(true),
          },
        },
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`OpenAI ${contract.schemaName} request failed (${response.status})`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const result = contract.parse(outputText(data).trim(), request);
    if (!result) {
      throw new Error(
        data.error?.message ?? `OpenAI returned an unusable ${contract.schemaName} result`,
      );
    }
    return { result, provider: "openai", model };
  };

export { createOpenAIAdapter };
