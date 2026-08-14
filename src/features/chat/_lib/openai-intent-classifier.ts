import type { ChatIntent, ProfileSection } from "@/features/chat/_lib/chat-intent";
import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";

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
    searchQuery: { type: "string" },
    searchKeywords: { type: "array", items: { type: "string" } },
  },
  required: ["sections", "searchQuery", "searchKeywords"],
} as const;

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

type ChatIntentClassifier = (
  messages: ChatRequestMessage[],
  signal: AbortSignal,
) => Promise<ChatIntent>;

const responseOutputText = (response: OpenAIResponse): string =>
  response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("") ?? "";

const parseChatIntent = (text: string): ChatIntent => {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || !("sections" in parsed)) {
    return { sections: [] };
  }
  const { sections, searchQuery, searchKeywords } = parsed as {
    sections?: unknown;
    searchQuery?: unknown;
    searchKeywords?: unknown;
  };
  if (!Array.isArray(sections) || sections.includes("none")) return { sections: [] };

  const valid = sections.filter(
    (section): section is ProfileSection =>
      section === "profile" ||
      section === "development" ||
      section === "music" ||
      section === "photography",
  );
  if (!valid.length) return { sections: [] };
  const query = typeof searchQuery === "string" ? searchQuery.trim() : "";
  const keywords = Array.isArray(searchKeywords)
    ? [
        ...new Set(
          searchKeywords
            .filter((keyword): keyword is string => typeof keyword === "string")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        ),
      ].slice(0, 8)
    : [];
  return {
    sections: [...new Set<ProfileSection>(["profile", ...valid])],
    searchQuery: query || undefined,
    searchKeywords: keywords.length ? keywords : undefined,
  };
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
          "A standalone number or similarly ambiguous input is none unless the recent conversation or the input itself gives a concrete reason to connect it to a public portfolio item, year, measurement, or identifier.",
          "Prefer including a plausible section over none when the user asks whether a portfolio item exists.",
          "development covers software projects, skills, career, education, and development awards.",
          "music covers performances, repertoire, music career, education, and music awards.",
          "photography covers photos, albums, cameras, places, scenery, and whether a pictured subject or location exists.",
          "profile covers identity, introduction, contact, and collaboration.",
          "Also produce searchQuery: a short standalone search query, in the user's language, stating what the latest message asks about with pronouns and follow-ups resolved from the conversation (e.g. '그건 언제였어?' after discussing awards becomes '수상 내역 연도'). Use an empty string when sections is none.",
          "Also produce searchKeywords: 3-8 short retrieval keywords for the same request — key nouns, proper nouns with spelling variants in both Korean and English (e.g. 아이답 and AIDAP, 캐논 and Canon), and close synonyms. Single words or two-word phrases. Use an empty array when sections is none.",
        ].join("\n"),
        input: messages
          .slice(-CLASSIFIER_HISTORY_LIMIT)
          .map(({ role, content }) => ({ role, content })),
        reasoning: { effort: "minimal" },
        // Responses API는 reasoning 토큰도 이 한도에 포함한다 — 한글 검색어 + 한영
        // 키워드 8개가 잘리면 JSON 파싱 실패로 조용히 정규식 폴백에 떨어지므로 여유를 둔다.
        max_output_tokens: 240,
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
    return parseChatIntent(responseOutputText(data));
  };

/**
 * 채팅 제공자 키를 공유하지 않는다 — 공유하면 CHAT_PROVIDER 를 Gemini 로 바꾸는 순간
 * 분류기가 조용히 꺼져 정규식 폴백으로 내려간다. 전용 키만 보게 해서 챗봇 제공자 교체와
 * 완전히 분리한다. 키가 없으면 chat-intent.ts 의 정규식 분류기가 그대로 동작한다.
 *
 * @returns {ChatIntentClassifier | undefined}
 */
const getChatIntentClassifier = (): ChatIntentClassifier | undefined => {
  const apiKey = process.env.CHAT_INTENT_PROVIDER_API_KEY?.trim();
  const model = process.env.CHAT_INTENT_MODEL?.trim() || "gpt-5-nano";
  return apiKey ? createOpenAIIntentClassifier(apiKey, model) : undefined;
};

export { createOpenAIIntentClassifier, getChatIntentClassifier, parseChatIntent };
export type { ChatIntentClassifier };
