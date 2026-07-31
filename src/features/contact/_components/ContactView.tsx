"use client";

import {
  type KeyboardEvent,
  memo,
  type PointerEvent,
  type RefObject,
  useMemo,
  useRef,
} from "react";

import { useContactForm } from "@/features/contact/_hooks/use-contact-form";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { SiteConfig, SiteLink } from "@/types/site";

import styles from "./ContactView.module.css";

/** Web3Forms 키 미설정 시 mailto 폴백 대상 — site.links 에 mailto 가 없을 때의 최후 폴백. */
const FALLBACK_EMAIL = "hello@example.com";
const MIN_TEXTAREA_HEIGHT = 132;

/** 링크 라벨 → 브랜드 글리프. GitHub만 채움(fill), 나머지는 라인(stroke). */
const SocialGlyph = ({ label }: { label: string }) => {
  const key = label.toLowerCase();
  if (key.includes("github")) {
    return (
      <svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  }
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (key.includes("instagram")) {
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...stroke}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // Email / 기타
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...stroke}>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 6l9 7 9-7" />
    </svg>
  );
};

const TextareaResizeHandle = memo(
  ({
    textareaRef,
    label,
  }: {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    label: string;
  }) => {
    const resizeStartRef = useRef<{ y: number; height: number } | null>(null);

    const setTextareaHeight = (height: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const nextHeight = Math.max(MIN_TEXTAREA_HEIGHT, height);
      textarea.style.height = `${nextHeight}px`;
    };

    const stopResizing = (event: PointerEvent<HTMLButtonElement>) => {
      resizeStartRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const step = event.shiftKey ? 32 : 16;

      if (event.key === "ArrowUp") setTextareaHeight(textarea.offsetHeight - step);
      else if (event.key === "ArrowDown") setTextareaHeight(textarea.offsetHeight + step);
      else if (event.key === "Home") setTextareaHeight(MIN_TEXTAREA_HEIGHT);
      else return;

      event.preventDefault();
    };

    return (
      <button
        type="button"
        className={styles.resizeHandle}
        data-textarea-resizer
        data-cursor-passive
        aria-label={label}
        aria-keyshortcuts="ArrowUp ArrowDown Home"
        onKeyDown={resizeWithKeyboard}
        onPointerDown={(event) => {
          const textarea = textareaRef.current;
          if (!textarea) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          resizeStartRef.current = { y: event.clientY, height: textarea.offsetHeight };
        }}
        onPointerMove={(event) => {
          const textarea = textareaRef.current;
          const start = resizeStartRef.current;
          if (!textarea || !start || !event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          setTextareaHeight(start.height + event.clientY - start.y);
        }}
        onPointerUp={stopResizing}
        onPointerCancel={stopResizing}
        onLostPointerCapture={() => {
          resizeStartRef.current = null;
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m7 13 6-6M11 13l2-2" />
        </svg>
      </button>
    );
  },
);
TextareaResizeHandle.displayName = "TextareaResizeHandle";

const ContactForm = ({ to }: { to: string }) => {
  const { dict } = useLang();
  const { status, submit, resetStatus } = useContactForm(to);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <form
      className={styles.form}
      onSubmit={submit}
      onInput={status === "idle" ? undefined : resetStatus}
    >
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>{dict.contactName}</span>
          <input className={styles.input} name="name" autoComplete="name" required />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{dict.contactEmail}</span>
          <input className={styles.input} name="email" type="email" autoComplete="email" required />
        </label>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-message">
          {dict.contactMessage}
        </label>
        <div className={styles.textareaWrap}>
          <textarea
            id="contact-message"
            ref={textareaRef}
            className={styles.textarea}
            name="message"
            rows={6}
            required
          />
          <TextareaResizeHandle textareaRef={textareaRef} label={dict.contactResizeMessage} />
        </div>
      </div>
      <button type="submit" className={styles.send} disabled={status === "sending"}>
        {status === "sending" ? dict.contactSending : dict.contactSend}
      </button>
      {status === "sent" ? (
        <p className={styles.status} role="status">
          {dict.contactSent}
        </p>
      ) : null}
      {status === "error" ? (
        <p className={`${styles.status} ${styles.statusError}`} role="alert">
          {dict.contactSendError}
        </p>
      ) : null}
    </form>
  );
};

/** 연락처 (/contact) — Web3Forms 발송 폼(키 미설정 시 mailto 폴백) + 직접 연락 버튼. */
const ContactView = ({ site }: { site: SiteConfig }) => {
  const { dict, lang } = useLang();

  /** mailto 폴백 대상 = site.links 중 mailto 링크, 없으면 폴백. */
  const to = useMemo(() => {
    const mail = site.links.find((link) => link.href.startsWith("mailto:"));
    return mail ? mail.href.replace(/^mailto:/, "") : FALLBACK_EMAIL;
  }, [site.links]);

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Contact</p>
        <h1 className={styles.title}>{dict.contactNav}</h1>
        <p className={styles.lead}>{pickText(site.contactLead, lang)}</p>
      </header>

      <div className={styles.socials}>
        {site.links.map((link: SiteLink) => (
          <a
            key={link.label}
            href={link.href}
            className={styles.social}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
          >
            <SocialGlyph label={link.label} />
            {link.label}
          </a>
        ))}
      </div>

      <ContactForm to={to} />
    </main>
  );
};

export { ContactView };
