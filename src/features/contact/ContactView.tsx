"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useLang } from "@/features/lang/use-lang";
import type { SiteConfig, SiteLink } from "@/types/site";

import styles from "./ContactView.module.css";

/** 서버가 없으므로 폼 제출 = 방문자 메일 클라이언트를 여는 mailto (원칙 #1 서버리스). */
const FALLBACK_EMAIL = "hello@example.com";

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

/** 연락처 (/contact) — mailto 폼 + 직접 연락 버튼(사이트 링크). */
const ContactView = ({ site }: { site: SiteConfig }) => {
  const { dict } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  /** 폼 mailto 대상 = site.links 중 mailto 링크, 없으면 폴백. */
  const to = useMemo(() => {
    const mail = site.links.find((link) => link.href.startsWith("mailto:"));
    return mail ? mail.href.replace(/^mailto:/, "") : FALLBACK_EMAIL;
  }, [site.links]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const subject = `[Portfolio] ${name.trim() || "Contact"}`;
    const body = `${message.trim()}\n\n— ${name.trim()} (${email.trim()})`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Contact</p>
        <h1 className={styles.title}>{dict.contactNav}</h1>
        <p className={styles.lead}>{dict.contactLead}</p>
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

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>{dict.contactName}</span>
            <input
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{dict.contactEmail}</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>{dict.contactMessage}</span>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            required
          />
        </label>
        <button type="submit" className={styles.send}>
          {dict.contactSend}
        </button>
      </form>
    </main>
  );
};

export { ContactView };
