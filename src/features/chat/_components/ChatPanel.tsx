"use client";

import Link from "next/link";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { Icon } from "@/components/Icon";
import { ChatComposer } from "@/features/chat/_components/ChatComposer";
import { PortfolioSearchStatus } from "@/features/chat/_components/PortfolioSearchStatus";
import { ChatReferenceCard } from "@/features/chat/_components/ChatReferenceCard";
import { useChat } from "@/features/chat/_hooks/use-chat";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useDialogIsolation } from "@/hooks/use-dialog-isolation";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import styles from "./ChatPanel.module.css";

const COPY = {
  ko: {
    title: "Ask Sungjoon.",
    close: "챗봇 닫기",
    input: "메시지",
    placeholder: "궁금한 내용을 입력하세요…",
    send: "메시지 보내기",
    retry: "다시 시도",
    privacy: "민감한 개인정보는 입력하지 마세요.",
    suggestions: [
      "개발 프로젝트를 소개해 줘",
      "사진 작업은 어디서 볼 수 있어?",
      "연락 방법을 알려줘",
    ],
  },
  en: {
    title: "Ask Sungjoon.",
    close: "Close chat",
    input: "Message",
    placeholder: "Ask about the portfolio…",
    send: "Send message",
    retry: "Try again",
    privacy: "Please don’t share sensitive personal information.",
    suggestions: [
      "Show me the development projects",
      "Where can I see the photos?",
      "How can I get in touch?",
    ],
  },
} as const;

type Props = { open: boolean; onClose: () => void };

const MESSAGE_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;
const PRESENCE_TRANSITION = { duration: 0.16, ease: "easeOut" } as const;

const ChatPanel = ({ open, onClose }: Props) => {
  const { lang } = useLang();
  const copy = COPY[lang];
  const { messages, isReplying, retry, send } = useChat(lang);
  const titleId = useId();
  useDialogIsolation(open, "[data-chat-overlay]");
  const panelRef = useFocusTrap(open);
  const overlayRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messageListAtBottomRef = useRef(true);
  const viewportTransitionRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const announcement =
    messages.findLast(
      (message) => message.id !== "welcome" && message.role === "assistant" && !message.pending,
    )?.content ?? "";

  useScrollLock(open, { fixBodyOnMobile: false });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (open && event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, isReplying, open, reduceMotion]);

  useEffect(() => {
    if (!open) return;

    const overlay = overlayRef.current;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    if (!overlay || !viewport || !mobile) return;
    const root = document.documentElement;
    const { body } = document;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const rootHeight = root.style.height;
    const bodyHeight = body.style.height;
    let fullViewportHeight = viewport.height;
    let frame = 0;
    let settleFrame = 0;

    const syncHeight = () => {
      const messageList = listRef.current;
      const stickToBottom = messageListAtBottomRef.current;
      viewportTransitionRef.current = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      frame = requestAnimationFrame(() => {
        fullViewportHeight = Math.max(fullViewportHeight, viewport.height);
        const viewportHeight =
          fullViewportHeight - viewport.height <= 48 ? fullViewportHeight : viewport.height;
        const height = `${viewportHeight}px`;
        root.style.height = height;
        body.style.height = height;
        overlay.style.setProperty("--chat-viewport-height", height);
        root.scrollTop = 0;
        body.scrollTop = 0;
        window.scrollTo(0, 0);
        settleFrame = requestAnimationFrame(() => {
          if (messageList && stickToBottom) {
            const scrollBehavior = messageList.style.scrollBehavior;
            messageList.style.scrollBehavior = "auto";
            messageList.scrollTop = messageList.scrollHeight;
            messageList.style.scrollBehavior = scrollBehavior;
            messageListAtBottomRef.current = true;
          }
          viewportTransitionRef.current = false;
        });
      });
    };

    syncHeight();
    viewport.addEventListener("resize", syncHeight);
    viewport.addEventListener("scroll", syncHeight);
    viewport.addEventListener("scrollend", syncHeight);
    window.addEventListener("resize", syncHeight);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      viewportTransitionRef.current = false;
      viewport.removeEventListener("resize", syncHeight);
      viewport.removeEventListener("scroll", syncHeight);
      viewport.removeEventListener("scrollend", syncHeight);
      window.removeEventListener("resize", syncHeight);
      root.style.height = rootHeight;
      body.style.height = bodyHeight;
      window.scrollTo(scrollX, scrollY);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div ref={overlayRef} className={styles.overlay} data-chat-overlay>
      <button
        className={styles.scrim}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div className={styles.identity}>
            <Icon name="sparkle" size={18} className={styles.identityIcon} />
            <h2 id={titleId} className={styles.title}>
              {copy.title}
            </h2>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={copy.close}
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div
          id="chat-message-scroll-container"
          ref={listRef}
          className={styles.messages}
          data-accent-scrollbar
          data-custom-scroll-container
          data-custom-scroll-priority
          data-custom-scroll-scope="local"
          role="log"
          aria-live="off"
          onScroll={(event) => {
            if (viewportTransitionRef.current) return;
            const element = event.currentTarget;
            messageListAtBottomRef.current =
              element.scrollHeight - element.clientHeight - element.scrollTop <= 2;
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <m.article
                key={message.id}
                className={styles.message}
                data-role={message.role}
                data-pending={message.pending || undefined}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : MESSAGE_TRANSITION}
                layout={reduceMotion ? false : "position"}
              >
                <div className={styles.bubble}>
                  {message.pending && !message.content ? (
                    <span className={styles.waitingState}>
                      <span className={styles.waitingDots} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className={message.pendingStatus ? undefined : styles.srOnly}>
                        {message.pendingStatus === "portfolio-search" ? (
                          <PortfolioSearchStatus key={lang} lang={lang} />
                        ) : lang === "ko" ? (
                          "답변 준비 중"
                        ) : (
                          "Preparing a response"
                        )}
                      </span>
                    </span>
                  ) : (
                    <p>
                      {message.content}
                      {message.pending ? (
                        <span className={styles.streamingCursor} aria-hidden="true" />
                      ) : null}
                    </p>
                  )}
                  {message.error?.retryable ? (
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={() => retry(message.id)}
                    >
                      {copy.retry}
                    </button>
                  ) : null}
                  {message.link ? (
                    <Link
                      className={styles.link}
                      href={message.link.href}
                      prefetch={false}
                      onClick={onClose}
                    >
                      {message.link.label} <span aria-hidden="true">↗</span>
                    </Link>
                  ) : null}
                  {message.links?.map((link) => (
                    <Link
                      key={`${link.href}:${link.label}`}
                      className={styles.link}
                      href={link.href}
                      prefetch={false}
                      onClick={onClose}
                    >
                      {link.label} <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                  {message.references?.length ? (
                    <div className={styles.references}>
                      {message.references.map((reference) => (
                        <ChatReferenceCard
                          key={`${reference.type}:${reference.id}`}
                          reference={reference}
                          onNavigate={onClose}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </m.article>
            ))}
            {messages.length === 1 ? (
              <m.div
                key="suggestions"
                className={styles.suggestions}
                aria-label={lang === "ko" ? "추천 질문" : "Suggested questions"}
                exit={
                  reduceMotion ? undefined : { opacity: 0, y: -4, transition: PRESENCE_TRANSITION }
                }
                transition={reduceMotion ? { duration: 0 } : PRESENCE_TRANSITION}
              >
                {copy.suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        <div className={styles.composerArea}>
          <ChatComposer
            inputLabel={copy.input}
            placeholder={copy.placeholder}
            sendLabel={copy.send}
            isReplying={isReplying}
            onSend={send}
          />
          <p className={styles.privacyNotice}>{copy.privacy}</p>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export { ChatPanel };
