import { expandRagQuery } from "@/lib/ai/rag-query";

import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";
import type { RagSection } from "@/types/rag";

type ProfileSection = RagSection;

/** 섹션 선택 + (LLM 분류기가 만든) 대명사 해소된 독립 검색어·검색 키워드. */
type ChatIntent = {
  sections: ProfileSection[];
  searchQuery?: string;
  searchKeywords?: string[];
};

const SECTION_TERMS: Record<Exclude<ProfileSection, "profile">, RegExp[]> = {
  development: [
    /개발|프로젝트|기술|스택|코드|프론트|앱|웹|이력서|블로그|아티클|포스트/i,
    /\b(?:developer|projects?|tech(?:nology)?|stack|code|front[ -]?end|apps?|web|resume|blogs?|articles?|posts?)\b/i,
  ],
  music: [
    /음악|피아노|연주|공연|리사이틀|협연|곡/i,
    /\b(?:music|piano|performances?|concerts?|recitals?)\b/i,
  ],
  photography: [
    /사진|촬영|앨범|카메라|렌즈|찍은|담은|스냅|화보|풍경|야경|노을|바다|출사/i,
    /\b(?:photos?|photographs?|shoot|albums?|cameras?|lenses?|pictures?|images?|shots?)\b/i,
  ],
};
const PROFILE_TERMS = /이성준|성준|sungjoon|소개|누구|연락|문의|협업|contact|collaborat/i;
const ALL_SECTION_TERMS = /포트폴리오|portfolio|모든 작업|전체 작업|all (?:work|projects)/i;
const SHARED_HISTORY_TERMS = /경력|학력|수상|career|education|award/i;
const FOLLOW_UP_TERMS =
  /^(?:(?:그|그거|그건|그게|그중|이거|이건|언제|어디|어떤|왜|어떻게|더|또|보여|알려)|(?:한|두|세|네|몇)\s*개|which|that|it|when|where|what|why|how|more|show|tell)(?:\s|[?!.]|$)/i;
const GREETING_ONLY_TERMS =
  /^(?:(?:안녕(?:하세요|하십니까)?|반가워(?:요)?|하이)|(?:hi|hello|hey))(?:[\s!?.~]*)$/iu;
const PUNCTUATION_ONLY_INPUT = /^[\p{P}\p{S}\s]+$/u;
const DEFAULT_INTENT_CLASSIFIER_TIMEOUT_MS = 3_000;

const getIntentClassifierTimeoutMs = (): number => {
  const configured = Number(process.env.CHAT_INTENT_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_INTENT_CLASSIFIER_TIMEOUT_MS;
};

const sectionsForText = (text: string): ProfileSection[] => {
  const searchableText = expandRagQuery(text);
  const matched = (
    Object.entries(SECTION_TERMS) as Array<[Exclude<ProfileSection, "profile">, RegExp[]]>
  ).flatMap(([section, patterns]) =>
    patterns.some((pattern) => pattern.test(searchableText)) ? [section] : [],
  );
  if (SHARED_HISTORY_TERMS.test(searchableText) && matched.length === 0) {
    matched.push("development", "music");
  }
  if (ALL_SECTION_TERMS.test(searchableText)) {
    return ["profile", "development", "music", "photography"];
  }
  if (matched.length) return ["profile", ...matched];
  return PROFILE_TERMS.test(searchableText) ? ["profile"] : [];
};

const selectProfileSections = (messages: ChatRequestMessage[]): ProfileSection[] => {
  const current = messages.at(-1)?.content.trim() ?? "";
  const direct = sectionsForText(current);
  if (direct.length || !FOLLOW_UP_TERMS.test(current)) return direct;

  const previousUserMessages = messages
    .slice(0, -1)
    .filter((message) => message.role === "user")
    .slice(-3)
    .toReversed();
  for (const message of previousUserMessages) {
    const previous = sectionsForText(message.content);
    if (previous.length) return previous;
  }
  return [];
};

const needsProfileContext = (messages: ChatRequestMessage[]): boolean =>
  selectProfileSections(messages).length > 0;

/**
 * RAG 검색어 휴리스틱 폴백 — 분류기가 searchQuery를 못 만들었을 때 사용한다.
 * 후속 질문("그건 언제였어?")은 단독으로 임베딩하면 무의미하므로
 * 직전 사용자 메시지들을 이어붙여 맥락을 복원한다.
 *
 * @param {ChatRequestMessage[]} messages
 * @returns {string}
 */
const buildRagQueryText = (messages: ChatRequestMessage[]): string => {
  const current = messages.at(-1)?.content.trim() ?? "";
  if (!FOLLOW_UP_TERMS.test(current)) return current;
  const previous = messages
    .slice(0, -1)
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content.trim());
  return [...previous, current].join("\n");
};

/**
 * 첫 사용자 입력 전체가 인사 또는 기호뿐이면 포트폴리오 분류를 생략한다.
 * 인사 뒤에 질문이 이어지거나 숫자가 들어오면 LLM이 포트폴리오 의도를 판단한다.
 */
const isStandaloneNonLookupInput = (messages: ChatRequestMessage[]): boolean => {
  const current = messages.at(-1)?.content.trim() ?? "";
  const hasPreviousUserMessage = messages.slice(0, -1).some((message) => message.role === "user");
  return (
    !hasPreviousUserMessage &&
    (GREETING_ONLY_TERMS.test(current) || PUNCTUATION_ONLY_INPUT.test(current))
  );
};

const selectChatIntentWithClassifier = async (
  messages: ChatRequestMessage[],
  signal: AbortSignal,
  classifier?: (messages: ChatRequestMessage[], signal: AbortSignal) => Promise<ChatIntent>,
): Promise<ChatIntent> => {
  const regexIntent: ChatIntent = { sections: selectProfileSections(messages) };
  if (!classifier || (regexIntent.sections.length === 0 && isStandaloneNonLookupInput(messages))) {
    return regexIntent;
  }

  try {
    const classifierSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(getIntentClassifierTimeoutMs()),
    ]);
    const classified = await classifier(messages, classifierSignal);
    return classified.sections.length ? classified : regexIntent;
  } catch (error) {
    if (signal.aborted) throw error;
    console.warn("Chat intent classification failed; using regex fallback:", error);
    return regexIntent;
  }
};

export {
  buildRagQueryText,
  isStandaloneNonLookupInput,
  needsProfileContext,
  selectChatIntentWithClassifier,
  selectProfileSections,
};
export type { ChatIntent, ProfileSection };
