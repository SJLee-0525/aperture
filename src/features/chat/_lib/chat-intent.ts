import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";
import { expandRagQuery } from "@/lib/ai/rag-query";
import type { RagSection } from "@/types/rag";

type ProfileSection = RagSection;

const SECTION_TERMS: Record<Exclude<ProfileSection, "profile">, RegExp[]> = {
  development: [
    /개발|프로젝트|기술|스택|코드|프론트|앱|웹|이력서/i,
    /\b(?:developer|projects?|tech(?:nology)?|stack|code|front[ -]?end|apps?|web|resume)\b/i,
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

const selectProfileSectionsWithClassifier = async (
  messages: ChatRequestMessage[],
  signal: AbortSignal,
  classifier?: (messages: ChatRequestMessage[], signal: AbortSignal) => Promise<ProfileSection[]>,
): Promise<ProfileSection[]> => {
  const regexSections = selectProfileSections(messages);
  if (!classifier) return regexSections;

  try {
    const classifierSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(getIntentClassifierTimeoutMs()),
    ]);
    const classified = await classifier(messages, classifierSignal);
    return classified.length ? classified : regexSections;
  } catch (error) {
    if (signal.aborted) throw error;
    console.warn("Chat intent classification failed; using regex fallback:", error);
    return regexSections;
  }
};

export { needsProfileContext, selectProfileSections, selectProfileSectionsWithClassifier };
export type { ProfileSection };
