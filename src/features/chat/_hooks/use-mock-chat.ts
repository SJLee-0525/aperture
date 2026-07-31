"use client";

import { useEffect, useRef, useState } from "react";

import { createInitialMessage, getMockReply } from "@/features/chat/_lib/mock-chat";
import type { ChatMessage } from "@/types/chat";
import type { Lang } from "@/types/lang";

const MOCK_DELAY_MS = 650;

const useMockChat = (lang: Lang) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createInitialMessage(lang)]);
  const [isReplying, setIsReplying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const send = (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isReplying) return false;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((current) => [...current, userMessage]);
    setIsReplying(true);

    timeoutRef.current = setTimeout(() => {
      const reply = getMockReply(question, lang);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", ...reply },
      ]);
      setIsReplying(false);
      timeoutRef.current = null;
    }, MOCK_DELAY_MS);
    return true;
  };

  return { messages, isReplying, send };
};

export { useMockChat };
