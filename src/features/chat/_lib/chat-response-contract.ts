import { MAX_RESPONSE_CHARS } from "@/features/chat/_lib/chat-tuning";
import type { ChatProviderResult } from "@/features/chat/_lib/chat-provider";
import type { ChatLink, ChatReferenceRequest } from "@/types/chat";

const CONTENT_DESCRIPTION =
  "A concise plain-text answer in the requested language. Do not include Markdown or URLs.";
const LINKS_DESCRIPTION =
  "Up to two directly relevant internal navigation actions. Usually empty. Do not add contact unless requested or the answer is unknown.";
const REFERENCES_DESCRIPTION =
  "Up to three concrete portfolio items directly relevant to the answer. Empty for general profile or contact questions.";

/**
 * 두 제공자가 같은 응답 계약을 쓰도록 한 곳에서 만든다.
 * OpenAI Structured Outputs(strict) 는 모든 object 에 additionalProperties:false 를 요구하고
 * Gemini responseJsonSchema 는 이 키를 받지 않으므로 strict 플래그로만 분기한다.
 */
const buildChatResponseSchema = ({ strict }: { strict: boolean }) => {
  const object = (properties: Record<string, unknown>, required: string[]) => ({
    type: "object",
    ...(strict ? { additionalProperties: false } : {}),
    properties,
    required,
  });

  return object(
    {
      content: { type: "string", description: CONTENT_DESCRIPTION },
      links: {
        type: "array",
        description: LINKS_DESCRIPTION,
        maxItems: 2,
        items: object({ label: { type: "string" }, href: { type: "string" } }, ["label", "href"]),
      },
      references: {
        type: "array",
        description: REFERENCES_DESCRIPTION,
        maxItems: 3,
        items: object(
          {
            type: { type: "string", enum: ["photo", "music", "project"] },
            id: { type: "string" },
          },
          ["type", "id"],
        ),
      },
    },
    ["content", "links", "references"],
  );
};

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

const parseChatResult = (text: string): ChatProviderResult => {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || typeof parsed.content !== "string") {
    throw new Error("Provider returned an invalid structured response");
  }
  const content = parsed.content.trim().slice(0, MAX_RESPONSE_CHARS);
  if (!content) throw new Error("Provider returned an empty response");
  return {
    content,
    links: parseLinks(parsed.links),
    references: parseReferences(parsed.references),
  };
};

/**
 * 출력 토큰 상한에 걸려 구조화 JSON 이 미완성일 때 본문만 회수한다.
 * 스트리밍 중 사용자에게 이미 보인 텍스트가 contentFromPartialJson 산출과 동일하므로
 * "본문 확정 + links/references 포기"가 "다 보여주고 오류"보다 항상 낫다.
 * 두 제공자 모두 이 경로를 쓰므로 메인·서브를 바꿔도 잘림 처리 방식이 달라지지 않는다.
 */
const parseOrSalvageChatResult = (text: string): ChatProviderResult => {
  try {
    return parseChatResult(text);
  } catch (error) {
    const content = contentFromPartialJson(text).slice(0, MAX_RESPONSE_CHARS).trim();
    if (!content) throw error;
    return { content };
  }
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

/**
 * 스트리밍 조각을 누적하면서 아직 내보내지 않은 본문 증분만 전달한다.
 * 구조화 JSON 이 완성되기 전에도 content 값만 뽑아 보여주기 위한 공통 로직으로,
 * 두 제공자의 스트림 처리 차이를 이 한 곳으로 흡수한다.
 */
const createStreamingContentCollector = (onContentDelta: (delta: string) => void) => {
  let serialized = "";
  let emitted = "";

  return {
    push(chunk: string) {
      serialized += chunk;
      const content = contentFromPartialJson(serialized).slice(0, MAX_RESPONSE_CHARS);
      if (content.length > emitted.length) {
        onContentDelta(content.slice(emitted.length));
        emitted = content;
      }
    },
    get serialized() {
      return serialized;
    },
  };
};

export {
  buildChatResponseSchema,
  contentFromPartialJson,
  createStreamingContentCollector,
  parseChatResult,
  parseOrSalvageChatResult,
};
