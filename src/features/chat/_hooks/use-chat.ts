"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildChatContext } from "@/features/chat/_lib/chat-context";
import { createInitialMessage } from "@/features/chat/_lib/chat-welcome";

import { DICTIONARY } from "@/constants/dictionary";

import type { ChatScreenTarget } from "@/lib/chat-screen-target-context";
import type { ChatMessage } from "@/types/chat";
import type { Lang } from "@/types/lang";

type ChatSuccessResponse = { message: Omit<ChatMessage, "id"> };
/*
 * 서버는 `code` 도 함께 보내지만 화면은 읽지 않는다. 문구가 이미 언어별로 완성돼 있고,
 * 재시도 여부는 `retryable` 이 따로 알려 준다. 읽지 않는 필드를 타입에 두면 화면이 코드로
 * 분기하는 것처럼 보인다.
 */
type ChatErrorResponse = { error?: { message?: string } };
type ChatStreamEvent =
  | { type: "status"; status: "portfolio-search" }
  | { type: "delta"; content: string }
  | { type: "done"; message: Omit<ChatMessage, "id"> }
  | { type: "error"; message: string; retryable?: boolean };

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

  // 서버가 스트림 도중 오류 이벤트를 보내는 정상 경로에서도 여기서 예외가 나간다.
  // reader 를 풀지 않으면 그 스트림이 잠긴 채 남는다. sse-stream.ts 와 같은 형태다.
  try {
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
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};

/**
 * 챗봇 메시지와 요청 상태를 관리한다. 화면 정보는 전송 직전 URL에서 읽는다.
 *
 * @param {Lang} lang 응답 및 오류 문구에 사용할 언어.
 * @param {(() => string | null) | undefined} getExcludedTargetKey 사용자가 제외한 항목의
 * `"type:id"` 키를 전송 시점에 읽는 함수.
 * @param {(() => ChatScreenTarget | null) | undefined} getScreenTarget 입력창에 표시된 화면
 * 항목을 전송 시점에 읽는 함수.
 * @returns {{ messages: ChatMessage[]; isReplying: boolean; retry: (messageId: string) => boolean; send: (rawQuestion: string) => boolean }} 메시지 목록과 전송 API.
 */
const useChat = (
  lang: Lang,
  getExcludedTargetKey?: () => string | null,
  getScreenTarget?: () => ChatScreenTarget | null,
) => {
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
    // 이 훅은 ref 를 대화 기록의 단일 출처로 쓴다. setState updater 안에서 ref 를 바꾸면
    // React 가 updater 를 다시 부르거나 결과를 버릴 때 ref 와 화면이 어긋난다.
    if (messagesRef.current.length !== 1 || messagesRef.current[0]?.id !== "welcome") return;
    const next = [createInitialMessage(lang)];
    messagesRef.current = next;
    setMessages(next);
  }, [lang]);

  const send = useCallback(
    (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || replyingRef.current) return false;

      // 재시도할 때도 저장된 값 대신 현재 URL을 사용한다.
      // 글 상세처럼 id가 URL에 없는 경로는 화면이 등록한 target에서 문서 ID를 읽는다.
      const registeredTarget = getScreenTarget?.() ?? null;
      let context = buildChatContext(
        window.location.pathname,
        new URLSearchParams(window.location.search),
        registeredTarget,
      );
      // 사용자가 제외한 항목과 현재 URL의 항목이 같을 때만 상세 정보를 뺀다.
      const excludedKey = getExcludedTargetKey?.() ?? null;
      if (
        context?.openTarget &&
        excludedKey === `${context.openTarget.type}:${context.openTarget.id}`
      ) {
        context = { pathname: context.pathname };
      }
      // 칩의 표시 대상과 실제 요청 target이 일치할 때만 사용자 메시지에 기록한다.
      const screenTarget = registeredTarget;
      const sentContext =
        context?.openTarget &&
        screenTarget?.type === context.openTarget.type &&
        screenTarget.id === context.openTarget.id
          ? {
              type: screenTarget.type,
              id: screenTarget.id,
              label: screenTarget.label,
              href: `${window.location.pathname}${window.location.search}`,
            }
          : undefined;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        ...(sentContext ? { sentContext } : {}),
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
        body: JSON.stringify({
          lang,
          messages: [...history, { role: "user", content: question }],
          ...(context ? { context } : {}),
        }),
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
          // 요청을 끊지 않으면 서버의 cancel 훅이 호출되지 않아, 방문자가 이미 오류
          // 화면을 보는 동안에도 진행 중인 LLM 요청이 끝까지 토큰을 소비한다.
          controller.abort();
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
          // 참조를 버리기 전에 끊는다. 순서를 바꾸면 언마운트 abort 가 null 을 보고
          // 아무것도 중단하지 못한다.
          controller.abort();
          if (requestRef.current === controller) requestRef.current = null;
          replyingRef.current = false;
          setIsReplying(false);
        });

      return true;
    },
    [lang, getExcludedTargetKey, getScreenTarget],
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
