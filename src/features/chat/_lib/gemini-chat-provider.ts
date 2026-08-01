import type { ChatProvider, ChatProviderResult } from "@/features/chat/_lib/chat-provider";
import type { ChatLink, ChatReferenceRequest } from "@/types/chat";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_RESPONSE_CHARS = 1_200;

const RESPONSE_SCHEMA = {
  type: "object",
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

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
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

const responseText = (data: GeminiResponse): string =>
  data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

const assertGeminiResponseAllowed = (data: GeminiResponse) => {
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw new GeminiMaxTokensError();
  if (data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") {
    throw new GeminiBlockedError();
  }
};

const readGeminiEventStream = async (
  response: Response,
  signal: AbortSignal,
  onData: (data: GeminiResponse) => void,
) => {
  if (!response.body) throw new Error("Gemini returned no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consume = (event: string) => {
    const payload = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (payload) onData(JSON.parse(payload) as GeminiResponse);
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

class GeminiRateLimitError extends Error {
  constructor() {
    super("Gemini rate limit exceeded");
    this.name = "GeminiRateLimitError";
  }
}

class GeminiBlockedError extends Error {
  constructor() {
    super("Gemini response was blocked");
    this.name = "GeminiBlockedError";
  }
}

class GeminiServiceUnavailableError extends Error {
  constructor() {
    super("Gemini service unavailable");
    this.name = "GeminiServiceUnavailableError";
  }
}

class GeminiMaxTokensError extends Error {
  constructor() {
    super("Gemini reached the maximum output token limit");
    this.name = "GeminiMaxTokensError";
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
    const reference: ChatReferenceRequest = { type: item.type, id: item.id.trim() };
    return [reference];
  });
  return references.length ? references : undefined;
};

const parseGeminiResult = (text: string): ChatProviderResult => {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || typeof parsed.content !== "string") {
    throw new Error("Gemini returned an invalid structured response");
  }
  const content = parsed.content.trim().slice(0, MAX_RESPONSE_CHARS);
  if (!content) throw new Error("Gemini returned an empty response");
  return {
    content,
    links: parseLinks(parsed.links),
    references: parseReferences(parsed.references),
  };
};

const createGeminiChatProvider =
  (apiKey: string, model: string): ChatProvider =>
  async ({ instructions, messages, signal, onContentDelta }) => {
    const response = await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:${onContentDelta ? "streamGenerateContent?alt=sse" : "generateContent"}`,
      {
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
            temperature: 0.4,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseJsonSchema: RESPONSE_SCHEMA,
          },
        }),
        signal,
      },
    );

    if (response.status === 429) throw new GeminiRateLimitError();
    if (response.status === 503) throw new GeminiServiceUnavailableError();
    if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);

    if (onContentDelta) {
      let serialized = "";
      let emitted = "";
      await readGeminiEventStream(response, signal, (data) => {
        assertGeminiResponseAllowed(data);
        serialized += responseText(data);
        const content = contentFromPartialJson(serialized).slice(0, MAX_RESPONSE_CHARS);
        if (content.length > emitted.length) {
          onContentDelta(content.slice(emitted.length));
          emitted = content;
        }
      });
      return parseGeminiResult(serialized.trim());
    }

    const data = (await response.json()) as GeminiResponse;
    assertGeminiResponseAllowed(data);
    const text = responseText(data).trim();
    if (!text) throw new Error("Gemini returned no content");
    return parseGeminiResult(text);
  };

export {
  createGeminiChatProvider,
  GeminiBlockedError,
  GeminiMaxTokensError,
  GeminiRateLimitError,
  GeminiServiceUnavailableError,
  parseGeminiResult,
};
