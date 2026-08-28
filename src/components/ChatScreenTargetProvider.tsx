"use client";

import { useMemo, useState } from "react";

import { ChatScreenTargetContext } from "@/lib/chat-screen-target-context";

import type { ChatScreenTarget } from "@/lib/chat-screen-target-context";
import type { ReactNode } from "react";

/**
 * 상세 모달의 표시 정보를 챗봇 패널에 전달한다.
 *
 * @param props 공개 페이지와 챗봇 런처.
 * @returns 화면 항목 Context Provider.
 */
const ChatScreenTargetProvider = ({ children }: { children: ReactNode }) => {
  const [target, setTarget] = useState<ChatScreenTarget | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return (
    <ChatScreenTargetContext.Provider value={value}>{children}</ChatScreenTargetContext.Provider>
  );
};

export { ChatScreenTargetProvider };
