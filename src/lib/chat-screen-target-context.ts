import { createContext } from "react";

import type { Dispatch, SetStateAction } from "react";

type ChatScreenTargetType = "photo" | "work" | "award" | "project";

/** 챗봇 입력창에 표시하는 상세 항목. 서버 요청에는 `type`과 `id`만 사용한다. */
type ChatScreenTarget = {
  type: ChatScreenTargetType;
  id: string;
  label: string;
};

type ChatScreenTargetValue = {
  target: ChatScreenTarget | null;
  setTarget: Dispatch<SetStateAction<ChatScreenTarget | null>>;
};

const ChatScreenTargetContext = createContext<ChatScreenTargetValue | null>(null);

export { ChatScreenTargetContext };
export type { ChatScreenTarget, ChatScreenTargetType };
