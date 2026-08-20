import { MAX_RESPONSE_CHARS } from "@/features/chat/_lib/chat-tuning";
import { parseContactDraft } from "@/features/chat/_lib/contact-draft";

import { truncateUtf16Safely } from "@/lib/text/truncate-utf16-safely";

import { CHAT_REFERENCE_TYPES } from "@/types/chat";

import type { ChatProviderResult } from "@/features/chat/_lib/chat-provider";
import type { ChatLink, ChatReferenceRequest, ChatReferenceType } from "@/types/chat";

const CONTENT_DESCRIPTION =
  "A concise plain-text answer in the requested language. Do not include Markdown or URLs.";
const LINKS_DESCRIPTION =
  "Up to two directly relevant internal navigation actions. Usually empty. Do not add contact unless requested or the answer is unknown.";
const REFERENCES_DESCRIPTION =
  "Up to three concrete portfolio items directly relevant to the answer. Empty for general profile or contact questions.";
const CONTACT_DRAFT_DESCRIPTION =
  "Almost always null. Fill only when the visitor asked to send a contact message AND already " +
  "provided its content in this chat. Use only values the visitor actually stated. Name and " +
  "email stay null unless they said them. Never invent or guess values.";

/**
 * 두 제공자가 같은 응답 계약을 쓰도록 한 곳에서 만든다.
 * OpenAI Structured Outputs(strict) 는 모든 object 에 additionalProperties:false 를 요구하고
 * Gemini responseJsonSchema 는 이 키를 받지 않으므로 strict 플래그로만 분기한다.
 *
 * @param {{ strict: boolean }} options
 * @param {boolean} options.strict
 * @returns {{ properties: Record<string, unknown>; required: string[]; additionalProperties?: boolean | undefined; type: string }}
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
            type: { type: "string", enum: [...CHAT_REFERENCE_TYPES] },
            id: { type: "string" },
          },
          ["type", "id"],
        ),
      },
      contactDraft: {
        // 두 provider가 지원하는 표준 type 배열로 nullable을 표현한다.
        type: ["object", "null"],
        description: CONTACT_DRAFT_DESCRIPTION,
        ...(strict ? { additionalProperties: false } : {}),
        properties: {
          name: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          message: { type: "string" },
        },
        required: ["name", "email", "message"],
      },
    },
    ["content", "links", "references", "contactDraft"],
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

const isReferenceType = (value: unknown): value is ChatReferenceType =>
  CHAT_REFERENCE_TYPES.some((type) => type === value);

const parseReferences = (value: unknown): ChatReferenceRequest[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const references = value.slice(0, 3).flatMap((item) => {
    if (
      !isRecord(item) ||
      !isReferenceType(item.type) ||
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
  const content = truncateUtf16Safely(parsed.content.trim(), MAX_RESPONSE_CHARS);
  if (!content) throw new Error("Provider returned an empty response");
  return {
    content,
    links: parseLinks(parsed.links),
    references: parseReferences(parsed.references),
    contactDraft: parseContactDraft(parsed.contactDraft),
  };
};

/**
 * 출력 토큰 상한에 걸려 구조화 JSON 이 미완성일 때 본문만 회수한다.
 * 스트리밍 중 사용자에게 이미 보인 텍스트가 contentFromPartialJson 산출과 동일하므로
 * "본문 확정 + links/references 포기"가 "다 보여주고 오류"보다 항상 낫다.
 * 두 제공자 모두 이 경로를 쓰므로 메인·서브를 바꿔도 잘림 처리 방식이 달라지지 않는다.
 *
 * @param {string} text
 * @returns {ChatProviderResult}
 */
const parseOrSalvageChatResult = (text: string): ChatProviderResult => {
  try {
    return parseChatResult(text);
  } catch (error) {
    const content = truncateUtf16Safely(contentFromPartialJson(text), MAX_RESPONSE_CHARS).trim();
    if (!content) throw error;
    // 잘린 JSON에서는 본문만 회수한다. 나머지 구조화 필드는 모두 버린다.
    return { content, contactDraft: null };
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
 * `"content"` 여는 따옴표를 찾을 때 조각 경계 앞으로 되짚는 길이.
 * `"content"` 와 공백, 콜론, 여는 따옴표를 합친 최소 12자를 덮는다.
 */
const CONTENT_KEY_LOOKBACK = 32;

/**
 * 이스케이프 시퀀스를 자르지 않고 디코딩할 수 있는 앞부분의 길이.
 * 조각 경계가 `\` 나 미완성 `\uXXXX` 한가운데에 놓이면 그 앞까지만 돌려준다.
 *
 * @param {string} value JSON 문자열 본문의 원문 조각.
 * @returns {number} 지금 디코딩해도 되는 길이.
 */
const safeDecodeLength = (value: string): number => {
  let index = 0;
  let safe = 0;
  while (index < value.length) {
    if (value[index] !== "\\") {
      index += 1;
      safe = index;
      continue;
    }
    const next = value[index + 1];
    if (next === undefined) return safe;
    if (next === "u") {
      if (index + 6 > value.length) return safe;
      index += 6;
    } else {
      index += 2;
    }
    safe = index;
  }
  return safe;
};

/**
 * JSON 문자열 본문 조각을 디코딩한다.
 *
 * 실패를 빈 문자열이 아니라 `null` 로 구분한다. 호출부가 원문을 소비할지 정하려면
 * "디코딩 결과가 비었다" 와 "디코딩이 깨졌다" 를 구분해야 한다.
 *
 * @param {string} raw 따옴표를 뺀 원문 조각.
 * @returns {string | null} 디코딩 결과. 깨진 조각이면 `null`.
 */
const decodeJsonStringSegment = (raw: string): string | null => {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return null;
  }
};

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

/**
 * 짝이 맞는 서로게이트만 남기고, 끝에 걸린 상위 서로게이트는 다음 조각을 위해 보류한다.
 *
 * JSON 파서는 짝 없는 서로게이트도 문자열로 받아들이고, 모델이 이모지를 `\uD83D` 와
 * `\uDE00` 두 이스케이프로 나눠 보내면 조각마다 반쪽이 온다. 반쪽을 그대로 방출하면
 * 화면에 대체 문자가 남는다.
 *
 * 순회는 code unit 단위다. `for...of` 는 코드 포인트 단위라 이미 온전한 짝을 한 덩어리로
 * 주어 판정이 어긋난다.
 *
 * @param {string} held 앞 조각에서 보류한 상위 서로게이트. 없으면 빈 문자열.
 * @param {string} decoded 이번에 디코딩한 조각.
 * @returns {{ text: string; held: string }} 방출할 문자열과 다음으로 넘길 보류분.
 */
const pairSurrogates = (held: string, decoded: string): { text: string; held: string } => {
  let text = "";
  let pending = held;
  for (let index = 0; index < decoded.length; index += 1) {
    const unit = decoded[index] ?? "";
    const code = unit.charCodeAt(0);
    if (pending) {
      if (isLowSurrogate(code)) {
        text += pending + unit;
        pending = "";
        continue;
      }
      // 짝을 만나지 못한 상위 서로게이트는 버리고 이 문자는 정상 처리한다.
      pending = "";
    }
    if (isHighSurrogate(code)) {
      pending = unit;
      continue;
    }
    // 짝 없는 하위 서로게이트도 유효한 텍스트가 아니다.
    if (isLowSurrogate(code)) continue;
    text += unit;
  }
  return { text, held: pending };
};

/**
 * 스트리밍 조각을 누적하면서 아직 내보내지 않은 본문 증분만 전달한다.
 * 구조화 JSON 이 완성되기 전에도 content 값만 뽑아 보여주기 위한 공통 로직으로,
 * 두 제공자의 스트림 처리 차이를 이 한 곳으로 흡수한다.
 *
 * 새로 도착한 조각만 훑는다. 매번 누적 문자열 전체를 다시 읽으면 답변 길이의 제곱에
 * 비례해 서버 CPU 시간이 늘어 요청 제한 시간을 갉아먹는다.
 *
 * 원문 디코딩이 깨지면 `error` 에 사유를 남기고 이후 방출을 멈춘다. 호출부는 결과를
 * 확정하기 전에 `error` 를 확인해야 한다. 이 값을 무시하면 깨진 구간이 빠진 답변이
 * 완성된 답변으로 나간다.
 *
 * @param {(delta: string) => void} onContentDelta
 * @returns {{ push(chunk: string): void; readonly serialized: string; readonly error: Error | null }}
 */
const createStreamingContentCollector = (onContentDelta: (delta: string) => void) => {
  let serialized = "";
  /** 여는 따옴표를 찾기 전까지 다시 훑기 시작할 위치. */
  let searchFrom = 0;
  /** content 문자열 본문에서 이미 훑은 위치. */
  let scanned = -1;
  let closed = false;
  /** 디코딩이 깨진 사유. 정상 종료(`closed`)와 구분해야 한다. */
  let invalidError: Error | null = null;
  /** 이스케이프 경계 때문에 아직 디코딩하지 않은 원문 꼬리. */
  let pendingRaw = "";
  let escaped = false;
  let emittedChars = 0;
  /** 짝을 기다리는 상위 서로게이트. content 가 닫히면 버린다. */
  let heldSurrogate = "";
  /** 상한에 걸려 잘린 뒤로는 방출하지 않는다. 이어 붙이면 순서가 뒤섞인다. */
  let capped = false;

  /** content 문자열이 시작하는 위치를 찾는다. 못 찾으면 -1. */
  const findContentStart = (): number => {
    const match = /"content"\s*:\s*"/.exec(serialized.slice(searchFrom));
    if (!match) {
      searchFrom = Math.max(searchFrom, serialized.length - CONTENT_KEY_LOOKBACK);
      return -1;
    }
    return searchFrom + match.index + match[0].length;
  };

  return {
    push(chunk: string) {
      serialized += chunk;
      if (closed || invalidError || capped) return;
      if (scanned < 0) {
        scanned = findContentStart();
        if (scanned < 0) return;
      }

      let raw = "";
      while (scanned < serialized.length) {
        const character = serialized[scanned] ?? "";
        if (!escaped && character === '"') {
          closed = true;
          break;
        }
        raw += character;
        escaped = escaped ? false : character === "\\";
        scanned += 1;
      }

      pendingRaw += raw;
      const safe = safeDecodeLength(pendingRaw);
      if (safe === 0) return;
      const decoded = decodeJsonStringSegment(pendingRaw.slice(0, safe));
      // 디코딩이 성공했을 때만 원문을 소비한다. 먼저 자르면 깨진 구간이 사라진 채
      // 스트림이 이어져, 방문자에게는 조용히 빠진 답변이 완성된 것처럼 보인다.
      if (decoded === null) {
        invalidError = new Error("Upstream content contained an invalid JSON escape");
        return;
      }
      pendingRaw = pendingRaw.slice(safe);

      const paired = pairSurrogates(heldSurrogate, decoded);
      // content 가 닫혔으면 짝을 기다릴 조각이 더 없다. 보류분은 버린다.
      heldSurrogate = closed ? "" : paired.held;
      if (!paired.text) return;

      const room = MAX_RESPONSE_CHARS - emittedChars;
      if (room <= 0) return;
      const delta = truncateUtf16Safely(paired.text, room);
      // 짝이 남은 자리에 다 들어가지 않으면 잘린 결과가 비어 있다.
      if (delta.length < paired.text.length) capped = true;
      if (!delta) return;
      emittedChars += delta.length;
      onContentDelta(delta);
    },
    get serialized() {
      return serialized;
    },
    get error() {
      return invalidError;
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
