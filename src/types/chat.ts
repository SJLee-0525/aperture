type ChatRole = "assistant" | "user";

type ChatLink = {
  href: string;
  label: string;
};

type ChatReferenceType = "music" | "photo" | "project";

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
  type: "photo" | "work" | "award" | "project";
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

export type {
  ChatLink,
  ChatMessage,
  ChatReference,
  ChatReferenceRequest,
  ChatSentContext,
  ContactDraft,
};
