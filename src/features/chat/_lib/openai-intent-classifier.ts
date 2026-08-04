import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";
import type { ProfileSection } from "@/features/chat/_lib/chat-intent";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const CLASSIFIER_HISTORY_LIMIT = 6;

const INTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sections: {
      type: "array",
      items: {
        type: "string",
        enum: ["none", "profile", "development", "music", "photography"],
      },
    },
  },
  required: ["sections"],
} as const;

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

type ChatIntentClassifier = (
  messages: ChatRequestMessage[],
  signal: AbortSignal,
) => Promise<ProfileSection[]>;

const responseOutputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

const parseIntentSections = (text: string): ProfileSection[] => {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || !("sections" in parsed)) return [];
  const sections = (parsed as { sections?: unknown }).sections;
  if (!Array.isArray(sections) || sections.includes("none")) return [];

  const valid = sections.filter(
    (section): section is ProfileSection =>
      section === "profile" ||
      section === "development" ||
      section === "music" ||
      section === "photography",
  );
  if (!valid.length) return [];
  return [...new Set<ProfileSection>(["profile", ...valid])];
};

const createOpenAIIntentClassifier =
  (apiKey: string, model: string): ChatIntentClassifier =>
  async (messages, signal) => {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: [
          "Classify which public portfolio sections are needed to answer the latest user message.",
          "Use the recent conversation to resolve follow-up questions and implied subjects.",
          "Return none only when no portfolio lookup is useful.",
          "Prefer including a plausible section over none when the user asks whether a portfolio item exists.",
          "development covers software projects, skills, career, education, and development awards.",
          "music covers performances, repertoire, music career, education, and music awards.",
          "photography covers photos, albums, cameras, places, scenery, and whether a pictured subject or location exists.",
          "profile covers identity, introduction, contact, and collaboration.",
        ].join("\n"),
        input: messages
          .slice(-CLASSIFIER_HISTORY_LIMIT)
          .map(({ role, content }) => ({ role, content })),
        reasoning: { effort: "minimal" },
        max_output_tokens: 80,
        store: false,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "portfolio_intent",
            strict: true,
            schema: INTENT_SCHEMA,
          },
        },
      }),
      signal,
    });

    if (!response.ok) throw new Error(`OpenAI intent classification failed (${response.status})`);
    const data = (await response.json()) as OpenAIResponse;
    return parseIntentSections(responseOutputText(data));
  };

/**
 * 채팅 제공자 키를 공유하지 않는다 — 공유하면 CHAT_PROVIDER 를 Gemini 로 바꾸는 순간
 * 분류기가 조용히 꺼져 정규식 폴백으로 내려간다. 전용 키만 보게 해서 챗봇 제공자 교체와
 * 완전히 분리한다. 키가 없으면 chat-intent.ts 의 정규식 분류기가 그대로 동작한다.
 */
const getChatIntentClassifier = (): ChatIntentClassifier | undefined => {
  const apiKey = process.env.CHAT_INTENT_PROVIDER_API_KEY?.trim();
  const model = process.env.CHAT_INTENT_MODEL?.trim() || "gpt-5-nano";
  return apiKey ? createOpenAIIntentClassifier(apiKey, model) : undefined;
};

export { createOpenAIIntentClassifier, getChatIntentClassifier, parseIntentSections };
export type { ChatIntentClassifier };
