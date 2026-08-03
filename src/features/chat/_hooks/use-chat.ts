"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DICTIONARY } from "@/constants/dictionary";

import { createInitialMessage } from "@/features/chat/_lib/chat-welcome";

import type { ChatMessage } from "@/types/chat";
import type { Lang } from "@/types/lang";

type ChatSuccessResponse = { message: Omit<ChatMessage, "id"> };
type ChatErrorResponse = { error?: { code?: string; message?: string } };
type ChatStreamEvent =
  | { type: "status"; status: "portfolio-search" }
  | { type: "delta"; content: string }
  | { type: "done"; message: Omit<ChatMessage, "id"> }
  | { type: "error"; code?: string; message: string; retryable?: boolean };

class ChatPublicError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

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

const getServerError = (value: unknown): ChatErrorResponse["error"] | null => {
  if (typeof value !== "object" || value === null) return null;
  const error = (value as ChatErrorResponse).error;
  return typeof error?.message === "string" && error.message.trim() ? error : null;
};

const isStreamEvent = (value: unknown): value is ChatStreamEvent => {
  if (typeof value !== "object" || value === null) return false;
  const event = value as { type?: unknown; content?: unknown; message?: unknown };
  if (event.type === "status") {
    return (event as { status?: unknown }).status === "portfolio-search";
  }
  if (event.type === "delta") return typeof event.content === "string";
  if (event.type === "error") return typeof event.message === "string";
  if (event.type !== "done") return false;
  return isSuccessResponse({ message: event.message });
};

const readEventStream = async (response: Response, onEvent: (event: ChatStreamEvent) => void) => {
  if (!response.body) throw new Error("Chat response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminalSeen = false;

  const emit = (event: ChatStreamEvent) => {
    if (event.type === "done" || event.type === "error") terminalSeen = true;
    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event: unknown = JSON.parse(line);
      if (!isStreamEvent(event)) throw new Error("Invalid chat stream event");
      emit(event);
    }
    if (done) break;
  }
  if (buffer.trim()) {
    const event: unknown = JSON.parse(buffer);
    if (!isStreamEvent(event)) throw new Error("Invalid chat stream event");
    emit(event);
  }
  if (!terminalSeen) throw new Error("Chat stream ended before a terminal event");
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
      const assistantId = crypto.randomUUID();
      const pendingMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
      };
      const history = messagesRef.current
        .filter((message) => message.id !== "welcome" && !message.error)
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));
      const nextMessages = [...messagesRef.current, userMessage, pendingMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      replyingRef.current = true;
      setIsReplying(true);

      const controller = new AbortController();
      requestRef.current = controller;

      void fetch("/api/chat", {
        method: "POST",
        headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: [...history, { role: "user", content: question }] }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await readResponseBody(response);
            const serverError = getServerError(body);
            throw new ChatPublicError(
              serverError?.message ?? DICTIONARY[lang].chatErrorFallback,
              response.status >= 500,
            );
          }
          if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
            const body = await readResponseBody(response);
            if (!isSuccessResponse(body))
              throw new ChatPublicError(DICTIONARY[lang].chatErrorFallback);
            messagesRef.current = messagesRef.current.map((message) =>
              message.id === assistantId ? { ...body.message, id: assistantId } : message,
            );
            setMessages(messagesRef.current);
            return;
          }

          await readEventStream(response, (event) => {
            if (event.type === "error") {
              throw new ChatPublicError(event.message, event.retryable === true);
            }
            messagesRef.current = messagesRef.current.map((message) => {
              if (message.id !== assistantId) return message;
              if (event.type === "status") {
                return { ...message, pendingStatus: event.status };
              }
              if (event.type === "delta") {
                return {
                  ...message,
                  content: `${message.content}${event.content}`,
                  pendingStatus: undefined,
                };
              }
              return { ...event.message, id: assistantId, pending: false };
            });
            setMessages(messagesRef.current);
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          const content =
            error instanceof ChatPublicError ? error.message : DICTIONARY[lang].chatErrorFallback;
          const retryable = error instanceof ChatPublicError ? error.retryable : true;
          messagesRef.current = messagesRef.current.map((message) =>
            message.id === assistantId
              ? {
                  id: assistantId,
                  role: "assistant",
                  content,
                  pending: false,
                  error: { retryable, question },
                }
              : message,
          );
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

  const retry = useCallback(
    (messageId: string) => {
      if (replyingRef.current) return false;
      const errorIndex = messagesRef.current.findIndex((message) => message.id === messageId);
      const errorMessage = messagesRef.current[errorIndex];
      if (!errorMessage?.error?.retryable) return false;
      const question = errorMessage.error.question;
      messagesRef.current = messagesRef.current.filter(
        (message, index) =>
          index !== errorIndex &&
          !(index === errorIndex - 1 && message.role === "user" && message.content === question),
      );
      setMessages(messagesRef.current);
      return send(question);
    },
    [send],
  );

  return { messages, isReplying, retry, send };
};

export { useChat };
