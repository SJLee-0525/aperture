"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createInitialMessage } from "@/features/chat/_lib/chat-welcome";
import type { ChatMessage } from "@/types/chat";
import type { Lang } from "@/types/lang";

const FALLBACK_ERROR: Record<Lang, string> = {
  ko: "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  en: "The response could not be loaded. Please try again shortly.",
};

type ChatSuccessResponse = { message: Omit<ChatMessage, "id"> };
type ChatErrorResponse = { error?: { message?: string } };

class ChatPublicError extends Error {}

const isSuccessResponse = (value: unknown): value is ChatSuccessResponse => {
  if (typeof value !== "object" || value === null) return false;
  const message = (value as { message?: unknown }).message;
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { role?: unknown }).role === "assistant" &&
    typeof (message as { content?: unknown }).content === "string"
  );
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getServerErrorMessage = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) return null;
  const error = (value as ChatErrorResponse).error;
  return typeof error?.message === "string" && error.message.trim() ? error.message : null;
};

const useChat = (lang: Lang) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createInitialMessage(lang)]);
  const [isReplying, setIsReplying] = useState(false);
  const messagesRef = useRef(messages);
  const replyingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== "welcome") return current;
      const next = [createInitialMessage(lang)];
      messagesRef.current = next;
      return next;
    });
  }, [lang]);

  const send = useCallback(
    (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || replyingRef.current) return false;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
      };
      const history = messagesRef.current
        .filter((message) => message.id !== "welcome")
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));
      const nextMessages = [...messagesRef.current, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      replyingRef.current = true;
      setIsReplying(true);

      const controller = new AbortController();
      requestRef.current = controller;

      void fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: [...history, { role: "user", content: question }] }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = await readResponseBody(response);
          if (!response.ok) {
            throw new ChatPublicError(getServerErrorMessage(body) ?? FALLBACK_ERROR[lang]);
          }
          if (!isSuccessResponse(body)) throw new ChatPublicError(FALLBACK_ERROR[lang]);
          return body.message;
        })
        .then((message) => {
          const assistantMessage: ChatMessage = { ...message, id: crypto.randomUUID() };
          messagesRef.current = [...messagesRef.current, assistantMessage];
          setMessages(messagesRef.current);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          const content = error instanceof ChatPublicError ? error.message : FALLBACK_ERROR[lang];
          const errorMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content,
          };
          messagesRef.current = [...messagesRef.current, errorMessage];
          setMessages(messagesRef.current);
        })
        .finally(() => {
          if (requestRef.current === controller) requestRef.current = null;
          replyingRef.current = false;
          setIsReplying(false);
        });

      return true;
    },
    [lang],
  );

  return { messages, isReplying, send };
};

export { useChat };
