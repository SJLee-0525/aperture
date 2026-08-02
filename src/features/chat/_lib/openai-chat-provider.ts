import type { ChatProvider, ChatProviderResult } from "@/features/chat/_lib/chat-provider";
import type { ChatLink, ChatReferenceRequest } from "@/types/chat";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_RESPONSE_CHARS = 1_200;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: {
      type: "string",
      description:
        "A concise plain-text answer in the requested language. Do not include Markdown or URLs.",
    },
    links: {
      type: "array",
      description:
        "Up to two directly relevant internal navigation actions. Usually empty. Do not add contact unless requested or the answer is unknown.",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          href: { type: "string" },
        },
        required: ["label", "href"],
      },
    },
    references: {
      type: "array",
      description:
        "Up to three concrete portfolio items directly relevant to the answer. Empty for general profile or contact questions.",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["photo", "music", "project"] },
          id: { type: "string" },
        },
        required: ["type", "id"],
      },
    },
  },
  required: ["content", "links", "references"],
} as const;

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

class OpenAIRateLimitError extends Error {
  constructor() {
    super("OpenAI rate limit exceeded");
    this.name = "OpenAIRateLimitError";
  }
}

class OpenAIServiceUnavailableError extends Error {
  constructor() {
    super("OpenAI service unavailable");
    this.name = "OpenAIServiceUnavailableError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseLinks = (value: unknown): ChatLink[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const links = value.slice(0, 2).flatMap((item) => {
    if (!isRecord(item) || typeof item.label !== "string" || typeof item.href !== "string") {
      return [];
    }
    return [{ label: item.label.trim(), href: item.href.trim() }];
  });
  return links.length ? links : undefined;
};

const parseReferences = (value: unknown): ChatReferenceRequest[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const references = value.slice(0, 3).flatMap((item) => {
    if (
      !isRecord(item) ||
      (item.type !== "photo" && item.type !== "music" && item.type !== "project") ||
      typeof item.id !== "string" ||
      !item.id.trim()
    ) {
      return [];
    }
    return [{ type: item.type, id: item.id.trim() } satisfies ChatReferenceRequest];
  });
  return references.length ? references : undefined;
};

const parseOpenAIResult = (text: string): ChatProviderResult => {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || typeof parsed.content !== "string") {
    throw new Error("OpenAI returned an invalid structured response");
  }
  const content = parsed.content.trim().slice(0, MAX_RESPONSE_CHARS);
  if (!content) throw new Error("OpenAI returned an empty response");
  return {
    content,
    links: parseLinks(parsed.links),
    references: parseReferences(parsed.references),
  };
};

const contentFromPartialJson = (serialized: string): string => {
  const match = /"content"\s*:\s*"/.exec(serialized);
  if (!match) return "";
  const start = match.index + match[0].length;
  let raw = "";
  let escaped = false;

  for (let index = start; index < serialized.length; index += 1) {
    const character = serialized[index] ?? "";
    if (!escaped && character === '"') break;
    raw += character;
    if (escaped) escaped = false;
    else if (character === "\\") escaped = true;
  }
  if (escaped) raw = raw.slice(0, -1);

  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return "";
  }
};

const responseOutputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

const readOpenAIEventStream = async (
  response: Response,
  signal: AbortSignal,
  onEvent: (event: OpenAIStreamEvent) => void,
) => {
  if (!response.body) throw new Error("OpenAI returned no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consume = (eventBlock: string) => {
    const payload = eventBlock
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (payload && payload !== "[DONE]") onEvent(JSON.parse(payload) as OpenAIStreamEvent);
  };

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replaceAll("\r\n", "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      consume(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);
};

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
        reasoning: { effort: "none" },
        max_output_tokens: 1_024,
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

    if (response.status === 429) throw new OpenAIRateLimitError();
    if (response.status >= 500) throw new OpenAIServiceUnavailableError();
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);

    if (onContentDelta) {
      let serialized = "";
      let emitted = "";
      let completedResponse: OpenAIResponse | undefined;
      await readOpenAIEventStream(response, signal, (event) => {
        if (event.type === "response.output_text.delta") {
          serialized += event.delta ?? "";
          const content = contentFromPartialJson(serialized).slice(0, MAX_RESPONSE_CHARS);
          if (content.length > emitted.length) {
            onContentDelta(content.slice(emitted.length));
            emitted = content;
          }
        } else if (event.type === "response.completed") {
          completedResponse = event.response;
        } else if (event.type === "response.failed" || event.type === "error") {
          throw new Error(
            event.error?.message ?? event.response?.error?.message ?? "OpenAI failed",
          );
        }
      });
      const finalText = responseOutputText(completedResponse ?? {}) || serialized;
      return parseOpenAIResult(finalText.trim());
    }

    const data = (await response.json()) as OpenAIResponse;
    const text = responseOutputText(data).trim();
    if (!text) throw new Error(data.error?.message ?? "OpenAI returned no content");
    return parseOpenAIResult(text);
  };

export {
  createOpenAIChatProvider,
  OpenAIRateLimitError,
  OpenAIServiceUnavailableError,
  parseOpenAIResult,
};
