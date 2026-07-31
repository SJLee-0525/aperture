"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { ChatComposer } from "@/features/chat/_components/ChatComposer";
import { useMockChat } from "@/features/chat/_hooks/use-mock-chat";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import styles from "./ChatPanel.module.css";

const COPY = {
  ko: {
    title: "Sungjoon Lee.",
    close: "챗봇 닫기",
    input: "메시지",
    placeholder: "궁금한 내용을 입력하세요…",
    send: "메시지 보내기",
    thinking: "답변을 준비하고 있어요…",
    suggestions: [
      "개발 프로젝트를 소개해 줘",
      "사진 작업은 어디서 볼 수 있어?",
      "연락 방법을 알려줘",
    ],
  },
  en: {
    title: "Sungjoon Lee.",
    close: "Close chat",
    input: "Message",
    placeholder: "Ask about the portfolio…",
    send: "Send message",
    thinking: "Preparing a response…",
    suggestions: [
      "Show me the development projects",
      "Where can I see the photos?",
      "How can I get in touch?",
    ],
  },
} as const;

type Props = { onClose: () => void };

const ChatPanel = ({ onClose }: Props) => {
  const { lang } = useLang();
  const copy = COPY[lang];
  const { messages, isReplying, send } = useMockChat(lang);
  const titleId = useId();
  const panelRef = useFocusTrap(true);
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useScrollLock(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, isReplying, reduceMotion]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay}>
      <button className={styles.scrim} type="button" aria-label={copy.close} onClick={onClose} />
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {copy.title}
          </h2>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={copy.close}
              onClick={onClose}
            >
              <span className={styles.closeIcon} aria-hidden="true">
                ×
              </span>
            </button>
          </div>
        </header>

        <div ref={listRef} className={styles.messages} data-accent-scrollbar aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={styles.message} data-role={message.role}>
              <div className={styles.bubble}>
                <p>{message.content}</p>
                {message.link ? (
                  <Link className={styles.link} href={message.link.href} onClick={onClose}>
                    {message.link.label} <span aria-hidden="true">↗</span>
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
          {messages.length === 1 ? (
            <div
              className={styles.suggestions}
              aria-label={lang === "ko" ? "추천 질문" : "Suggested questions"}
            >
              {copy.suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          {isReplying ? <p className={styles.thinking}>{copy.thinking}</p> : null}
        </div>

        <ChatComposer
          inputLabel={copy.input}
          placeholder={copy.placeholder}
          sendLabel={copy.send}
          isReplying={isReplying}
          onSend={send}
        />
      </section>
    </div>,
    document.body,
  );
};

export { ChatPanel };
