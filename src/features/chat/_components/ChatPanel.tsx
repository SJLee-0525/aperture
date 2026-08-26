"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { Icon } from "@/components/Icon";
import { ChatComposer } from "@/features/chat/_components/ChatComposer";
import { ChatContactDraftButton } from "@/features/chat/_components/ChatContactDraftButton";
import { ChatReferenceCard } from "@/features/chat/_components/ChatReferenceCard";
import { ChatSentContext } from "@/features/chat/_components/ChatSentContext";
import { PortfolioSearchStatus } from "@/features/chat/_components/PortfolioSearchStatus";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useChat } from "@/features/chat/_hooks/use-chat";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useChatScreenTarget } from "@/hooks/use-chat-screen-target";
import { useDialogIsolation } from "@/hooks/use-dialog-isolation";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useOverlayLayer } from "@/hooks/use-overlay-layer";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import { ROUTES } from "@/constants/routes";

import type { UIDict } from "@/constants/dictionary";
import type { ChatScreenTargetType } from "@/lib/chat-screen-target-context";

import styles from "./ChatPanel.module.css";

type Props = { open: boolean; onClose: () => void };

/** 상세 항목 종류에 맞는 chip 문구와 입력 안내를 고른다. */
const SCREEN_NOTICES: Record<
  ChatScreenTargetType,
  (dict: UIDict) => { notice: string; placeholder: string }
> = {
  photo: (dict) => ({
    notice: dict.chatScreenNoticePhoto,
    placeholder: dict.chatScreenPlaceholderPhoto,
  }),
  work: (dict) => ({
    notice: dict.chatScreenNoticeWork,
    placeholder: dict.chatScreenPlaceholderWork,
  }),
  award: (dict) => ({
    notice: dict.chatScreenNoticeAward,
    placeholder: dict.chatScreenPlaceholderAward,
  }),
  project: (dict) => ({
    notice: dict.chatScreenNoticeProject,
    placeholder: dict.chatScreenPlaceholderProject,
  }),
  article: (dict) => ({
    notice: dict.chatScreenNoticeArticle,
    placeholder: dict.chatScreenPlaceholderArticle,
  }),
};

const MESSAGE_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;
const PRESENCE_TRANSITION = { duration: 0.16, ease: "easeOut" } as const;

const ChatPanel = ({ open, onClose }: Props) => {
  const { lang, dict } = useLang();

  // 제목은 표시용이다. 요청에 넣을 항목은 useChat이 현재 URL에서 다시 읽는다.
  const screenTarget = useChatScreenTarget();
  const targetKey = screenTarget ? `${screenTarget.type}:${screenTarget.id}` : null;
  const [excludedKey, setExcludedKey] = useState<string | null>(null);
  // 제외 설정은 해당 항목에만 적용한다. 다른 항목을 열면 다시 활성화한다.
  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  if (prevTargetKey !== targetKey) {
    setPrevTargetKey(targetKey);
    if (excludedKey !== null) setExcludedKey(null);
  }
  const excludedRef = useRef(excludedKey);
  const screenTargetRef = useRef(screenTarget);
  useEffect(() => {
    excludedRef.current = excludedKey;
  }, [excludedKey]);
  useEffect(() => {
    screenTargetRef.current = screenTarget;
  }, [screenTarget]);
  const getExcludedTargetKey = useCallback(() => excludedRef.current, []);
  const getScreenTarget = useCallback(() => screenTargetRef.current, []);
  const chipTarget = screenTarget && excludedKey !== targetKey ? screenTarget : null;
  const screenTexts = chipTarget ? SCREEN_NOTICES[chipTarget.type](dict) : null;
  const dismissScreenTarget = useCallback(() => setExcludedKey(targetKey), [targetKey]);
  // ChatComposer는 memo라 토큰 객체 identity를 안정화한다.
  const contextToken = useMemo(
    () =>
      chipTarget && screenTexts
        ? {
            label: chipTarget.label,
            notice: screenTexts.notice,
            dismissLabel: dict.chatScreenNoticeDismiss,
            onDismiss: dismissScreenTarget,
          }
        : null,
    [chipTarget, screenTexts, dict.chatScreenNoticeDismiss, dismissScreenTarget],
  );

  const { messages, isReplying, retry, send } = useChat(
    lang,
    getExcludedTargetKey,
    getScreenTarget,
  );
  const titleId = useId();
  const panelRef = useFocusTrap(open);
  const overlayRef = useRef<HTMLDivElement>(null);
  useDialogIsolation(open, overlayRef);
  const listRef = useRef<HTMLDivElement>(null);
  const messageListAtBottomRef = useRef(true);
  const viewportTransitionRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const announcement =
    messages.findLast(
      (message) => message.id !== "welcome" && message.role === "assistant" && !message.pending,
    )?.content ?? "";

  useScrollLock(open, { fixBodyOnMobile: false });
  const isTopLayer = useOverlayLayer(open);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (open && isTopLayer && event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isTopLayer, onClose, open]);

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
      {/* data-chat-panel: Sentry Replay 차단 셀렉터 — 방문자가 입력한 질문이 재생본에 남지 않게 한다(ADR-0004). */}
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-chat-panel
      >
        <div className={styles.header}>
          <div className={styles.identity}>
            <Icon name="sparkle" size={18} className={styles.identityIcon} />
            <h2 id={titleId} className={styles.title}>
              {dict.chatTitle}
            </h2>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={dict.chatCloseLabel}
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
                      <span className={message.pendingStatus ? undefined : "sr-only"}>
                        {message.pendingStatus === "portfolio-search" ? (
                          <PortfolioSearchStatus key={lang} lang={lang} />
                        ) : (
                          dict.chatPreparingLabel
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
                  {message.role === "user" && message.sentContext ? (
                    <ChatSentContext context={message.sentContext} onNavigate={onClose} />
                  ) : null}
                  {message.error?.retryable ? (
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={() => retry(message.id)}
                    >
                      {dict.chatRetryLabel}
                    </button>
                  ) : null}
                  {message.link ? (
                    <LocalizedLink
                      className={styles.link}
                      href={message.link.href}
                      prefetch={false}
                      onClick={onClose}
                    >
                      {message.link.label} <span aria-hidden="true">↗</span>
                    </LocalizedLink>
                  ) : null}
                  {message.links?.map((link) => (
                    <LocalizedLink
                      key={`${link.href}:${link.label}`}
                      className={styles.link}
                      href={link.href}
                      prefetch={false}
                      onClick={onClose}
                    >
                      {link.label} <span aria-hidden="true">↗</span>
                    </LocalizedLink>
                  ))}
                  {message.contactDraft && !message.pending ? (
                    <ChatContactDraftButton
                      draft={message.contactDraft}
                      label={dict.chatContactDraftLabel}
                      className={styles.link}
                      onNavigate={onClose}
                    />
                  ) : null}
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
                aria-label={dict.chatSuggestionsLabel}
                exit={
                  reduceMotion ? undefined : { opacity: 0, y: -4, transition: PRESENCE_TRANSITION }
                }
                transition={reduceMotion ? { duration: 0 } : PRESENCE_TRANSITION}
              >
                {dict.chatSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        <div className={styles.composerArea}>
          <ChatComposer
            inputLabel={dict.chatInputLabel}
            placeholder={screenTexts?.placeholder ?? dict.chatPlaceholder}
            sendLabel={dict.chatSendLabel}
            isReplying={isReplying}
            onSend={send}
            contextToken={contextToken}
          />
          <p className={styles.privacyNotice}>
            {dict.chatPrivacyNote}{" "}
            <LocalizedLink href={ROUTES.PRIVACY} onClick={onClose}>
              {dict.privacyNav}
            </LocalizedLink>
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export { ChatPanel };
