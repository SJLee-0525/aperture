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
  async ({ instructions, messages, signal }) => {
    const response = await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`,
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
            temperature: 0.3,
            maxOutputTokens: 512,
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

    const data = (await response.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    if (data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") {
      throw new GeminiBlockedError();
    }
    const text = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned no content");
    return parseGeminiResult(text);
  };

export {
  createGeminiChatProvider,
  GeminiBlockedError,
  GeminiRateLimitError,
  GeminiServiceUnavailableError,
  parseGeminiResult,
};
