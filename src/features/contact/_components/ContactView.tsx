"use client";

import {
  type KeyboardEvent,
  memo,
  type PointerEvent,
  type RefObject,
  useMemo,
  useRef,
} from "react";

import { SocialGlyph } from "@/components/SocialGlyph";
import { useContactForm } from "@/features/contact/_hooks/use-contact-form";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { SiteConfig, SiteLink } from "@/types/site";

import styles from "./ContactView.module.css";

/** Web3Forms 키 미설정 시 mailto 폴백 대상 — site.links 에 mailto 가 없을 때의 최후 폴백. */
const FALLBACK_EMAIL = "hello@example.com";
const MIN_TEXTAREA_HEIGHT = 132;

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
