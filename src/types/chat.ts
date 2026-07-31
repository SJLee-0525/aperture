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

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  link?: ChatLink;
  links?: ChatLink[];
  references?: ChatReference[];
};

export type { ChatLink, ChatMessage, ChatReference, ChatReferenceRequest };
