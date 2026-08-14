type ChatRole = "assistant" | "user";

type ChatLink = {
  href: string;
  label: string;
};

/**
 * 참조 카드 종류의 단일 출처. 응답 JSON Schema enum·파서·라벨·섹션 경로표가 모두 여기서 파생한다.
 * 값을 따로 나열하면 파서만 빠뜨렸을 때 모델이 보낸 참조가 오류 없이 사라진다.
 */
const CHAT_REFERENCE_TYPES = ["article", "music", "photo", "project"] as const;

type ChatReferenceType = (typeof CHAT_REFERENCE_TYPES)[number];

type ChatReferenceRequest = {
  type: ChatReferenceType;
  id: string;
};

type ChatReference = ChatReferenceRequest & {
  title: string;
  subtitle: string;
  href: string;
  image: { url: string; width: number; height: number } | null;
};

/** 질문과 함께 전송된 화면 항목의 표시용 스냅샷. API 대화 이력에는 포함하지 않는다. */
type ChatSentContext = {
  type: "photo" | "work" | "award" | "project" | "article";
  id: string;
  label: string;
  href: string;
};

/**
 * 챗봇이 정리한 연락 초안. 방문자가 버튼을 누르면 sessionStorage를 거쳐 연락 폼으로
 * 전달된다. 버튼 문구는 dictionary에서 읽으므로 이 타입에 표시용 필드는 없다.
 */
type ContactDraft = {
  name: string | null;
  email: string | null;
  message: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
  pendingStatus?: "portfolio-search";
  error?: { retryable: boolean; question: string };
  link?: ChatLink;
  links?: ChatLink[];
  references?: ChatReference[];
  contactDraft?: ContactDraft;
  sentContext?: ChatSentContext;
};

export { CHAT_REFERENCE_TYPES };
export type {
  ChatLink,
  ChatMessage,
  ChatReference,
  ChatReferenceRequest,
  ChatReferenceType,
  ChatSentContext,
  ContactDraft,
};
