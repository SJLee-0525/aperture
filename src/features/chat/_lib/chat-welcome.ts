import type { ChatMessage } from "@/types/chat";
import type { Lang } from "@/types/lang";

const INITIAL_MESSAGE: Record<Lang, string> = {
  ko: "안녕하세요. 사진, 음악, 개발 작업에 관해 무엇이든 물어보세요.",
  en: "Hello. Ask me anything about the photography, music, or development work.",
};

const createInitialMessage = (lang: Lang): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  content: INITIAL_MESSAGE[lang],
});

export { createInitialMessage };
