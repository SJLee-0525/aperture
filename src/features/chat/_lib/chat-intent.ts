import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";

type ProfileSection = "profile" | "development" | "music" | "photography";

const SECTION_TERMS: Record<Exclude<ProfileSection, "profile">, RegExp> = {
  development:
    /개발|프로젝트|기술|스택|코드|프론트|앱|웹|이력서|developer|project|tech|stack|code|front.?end|app|web|resume/i,
  music: /음악|피아노|연주|공연|리사이틀|협연|곡|music|piano|performance|concert|recital/i,
  photography: /사진|촬영|앨범|카메라|렌즈|photo|photograph|shoot|album|camera|lens/i,
};
const PROFILE_TERMS = /이성준|성준|sungjoon|소개|누구|연락|문의|협업|contact|collaborat/i;
const ALL_SECTION_TERMS = /포트폴리오|portfolio|모든 작업|전체 작업|all (?:work|projects)/i;
const SHARED_HISTORY_TERMS = /경력|학력|수상|career|education|award/i;
const FOLLOW_UP_TERMS =
  /^(그|그거|그건|그게|그중|이거|이건|언제|어디|어떤|왜|어떻게|더|또|보여|알려|which|that|it|when|where|what|why|how|more|show|tell)(?:\s|[?!.]|$)/i;

const sectionsForText = (text: string): ProfileSection[] => {
  const matched = (
    Object.entries(SECTION_TERMS) as Array<[Exclude<ProfileSection, "profile">, RegExp]>
  ).flatMap(([section, pattern]) => (pattern.test(text) ? [section] : []));
  if (SHARED_HISTORY_TERMS.test(text) && matched.length === 0) {
    matched.push("development", "music");
  }
  if (ALL_SECTION_TERMS.test(text)) return ["profile", "development", "music", "photography"];
  if (matched.length) return ["profile", ...matched];
  return PROFILE_TERMS.test(text) ? ["profile"] : [];
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

export { needsProfileContext, selectProfileSections };
export type { ProfileSection };
