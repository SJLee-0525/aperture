"use client";

import Script from "next/script";
import {
  type KeyboardEvent,
  memo,
  type PointerEvent,
  type RefObject,
  useMemo,
  useRef,
} from "react";

import { SocialGlyph } from "@/components/SocialGlyph";
import { ROUTES } from "@/constants/routes";
import { useCaptchaState } from "@/features/contact/_hooks/use-captcha-state";
import { useContactForm } from "@/features/contact/_hooks/use-contact-form";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import { mailtoAddress } from "@/lib/security/public-url";
import type { SiteConfig, SiteLink } from "@/types/site";

import styles from "./ContactView.module.css";

/** Web3Forms 키 미설정 시 mailto 폴백 대상 — site.links 에 mailto 가 없을 때의 최후 폴백. */
const FALLBACK_EMAIL = "hello@example.com";
const MIN_TEXTAREA_HEIGHT = 132;
const CAPTCHA_HINT_ID = "contact-captcha-hint";
/** 키가 있어야 Web3Forms 로 실제 발송한다 — 없으면 mailto 폴백이라 캡차도 필요 없다. */
const WEB3FORMS_ENABLED = Boolean(process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY);

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
  const formRef = useRef<HTMLFormElement>(null);
  const captcha = useCaptchaState(formRef);
  // 위젯이 렌더되지 않은 동안(스크립트 로드 전·차단됨)에는 잠그지 않는다 —
  // 잠그면 캡차가 끝내 안 뜨는 환경에서 폼이 영영 죽은 버튼이 된다.
  // 그 경우는 제출 시 use-contact-form 이 "captcha-required" 안내로 막는다.
  const blockedByCaptcha = captcha.rendered && !captcha.solved;

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={submit}
      onInput={status === "idle" ? undefined : resetStatus}
    >
      {/*
        Web3Forms 허니팟 — 봇은 보이지 않는 필드까지 채우므로 값이 있으면 Web3Forms 가 조용히 버린다.
        access key 는 번들에 노출되는 공개 키라(설계상 정상) 엔드포인트로 직접 쏘는 스팸은
        이 필드로 막히지 않는다. 그건 Web3Forms 대시보드의 캡차가 담당한다.
      */}
      <input
        type="checkbox"
        name="botcheck"
        className={styles.botcheck}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
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
      {/*
        Web3Forms 클라이언트 스크립트가 data-captcha 를 보고 hCaptcha 를 렌더한다.
        hCaptcha 가 폼 안에 <textarea name="h-captcha-response"> 를 심으므로,
        제출 훅은 FormData 에서 그 토큰을 그대로 읽는다 (use-contact-form.ts).

        캡차는 Web3Forms 제출 전용이다 — 키가 없으면 폼이 mailto 폴백으로 동작하므로
        위젯을 띄우지 않는다. 띄우면 메일 앱을 여는 데까지 캡차를 풀어야 한다(로컬 dev).
      */}
      {WEB3FORMS_ENABLED ? (
        <>
          <div className={styles.captcha}>
            <div className="h-captcha" data-captcha="true" />
          </div>
          <Script src="https://web3forms.com/client/script.js" strategy="lazyOnload" />
        </>
      ) : null}
      <p className={styles.privacyNotice}>
        {dict.contactPrivacyNotice}{" "}
        <LocalizedLink href={ROUTES.PRIVACY}>{dict.privacyNav}</LocalizedLink>
      </p>
      <button
        type="submit"
        className={styles.send}
        disabled={status === "sending" || blockedByCaptcha}
        // 버튼이 왜 잠겼는지 스크린리더에도 전달한다.
        aria-describedby={blockedByCaptcha ? CAPTCHA_HINT_ID : undefined}
      >
        {status === "sending" ? dict.contactSending : dict.contactSend}
      </button>
      {blockedByCaptcha ? (
        <p id={CAPTCHA_HINT_ID} className={styles.hint}>
          {dict.contactCaptchaRequired}
        </p>
      ) : null}
      {status === "sent" ? (
        <p className={styles.status} role="status">
          {dict.contactSent}
        </p>
      ) : null}
      {status === "error" || status === "captcha-required" ? (
        <p className={`${styles.status} ${styles.statusError}`} role="alert">
          {status === "captcha-required" ? dict.contactCaptchaRequired : dict.contactSendError}
        </p>
      ) : null}
    </form>
  );
};

/**
 * 연락처 (/contact) — Web3Forms 발송 폼(키 미설정 시 mailto 폴백) + 직접 연락 버튼.
 *
 * @param {{ site: SiteConfig }} props
 * @param {SiteConfig} props.site
 * @returns {JSX.Element}
 */
const ContactView = ({ site }: { site: SiteConfig }) => {
  const { dict, lang } = useLang();

  const to = useMemo(() => {
    const address = site.links.map(({ href }) => mailtoAddress(href)).find(Boolean);
    return address || FALLBACK_EMAIL;
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
