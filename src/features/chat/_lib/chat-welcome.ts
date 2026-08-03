import { DICTIONARY } from "@/constants/dictionary";

import type { ChatMessage } from "@/types/chat";
import type { Lang } from "@/types/lang";

const createInitialMessage = (lang: Lang): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  content: DICTIONARY[lang].chatWelcome,
});

export { createInitialMessage };
