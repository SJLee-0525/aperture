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

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const PROVIDER_LABEL = "OpenAI";
/**
 * 추론 토큰도 max_output_tokens 를 소모하므로 본문 예산을 지키려고 끈다.
 * Gemini 쪽은 모델 세대마다 필드가 달라 같은 조치를 하지 않으며(해당 파일 주석 참고),
 * 대신 양쪽 모두 넉넉한 MAX_OUTPUT_TOKENS 를 공유해 잘림을 예방한다.
 */
const REASONING_EFFORT = "none";

const RESPONSE_SCHEMA = buildChatResponseSchema({ strict: true });

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

type OpenAIStreamEvent = {
  type?: string;
  delta?: string;
  response?: OpenAIResponse;
  error?: { message?: string };
};

const responseOutputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

const createOpenAIChatProvider =
  (apiKey: string, model: string): ChatProvider =>
  async ({ instructions, messages, signal, onContentDelta }) => {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input: messages.map(({ role, content }) => ({ role, content })),
        reasoning: { effort: REASONING_EFFORT },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
        stream: Boolean(onContentDelta),
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "portfolio_chat_response",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
      signal,
    });

    assertUpstreamResponseOk(PROVIDER_LABEL, response);

    if (onContentDelta) {
      const collector = createStreamingContentCollector(onContentDelta);
      let completedResponse: OpenAIResponse | undefined;

      await readSseStream(response, signal, (payload) => {
        const event = JSON.parse(payload) as OpenAIStreamEvent;
        if (event.type === "response.output_text.delta") {
          collector.push(event.delta ?? "");
        } else if (event.type === "response.completed" || event.type === "response.incomplete") {
          completedResponse = event.response;
        } else if (event.type === "response.failed" || event.type === "error") {
          throw new Error(
            event.error?.message ?? event.response?.error?.message ?? "OpenAI failed",
          );
        }
      });

      const finalText = responseOutputText(completedResponse ?? {}) || collector.serialized;
      return parseOrSalvageChatResult(finalText.trim());
    }

    const data = (await response.json()) as OpenAIResponse;
    const text = responseOutputText(data).trim();
    if (!text) {
      throw new ChatUpstreamError("invalid", data.error?.message ?? "OpenAI returned no content");
    }
    return parseOrSalvageChatResult(text);
  };

export { createOpenAIChatProvider };
