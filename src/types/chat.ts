type ChatRole = "assistant" | "user";

type ChatLink = {
  href: string;
  label: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  link?: ChatLink;
};

export type { ChatLink, ChatMessage, ChatRole };
