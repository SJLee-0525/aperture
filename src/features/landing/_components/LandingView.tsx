"use client";

import Link from "next/link";
import { type CSSProperties, useMemo } from "react";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useTyping } from "@/hooks/use-typing";
import { pickText } from "@/lib/i18n/pick-text";
import type { SiteConfig } from "@/types/site";

import styles from "./LandingView.module.css";

/** 랜딩 진입 행 — 각 섹션의 액센트를 미리 보여준다(hover 채움). */
const SECTIONS = [
  { key: "dev", href: ROUTES.DEV, labelKey: "sectionDev" },
  { key: "photo", href: ROUTES.PHOTO, labelKey: "sectionPhoto" },
  { key: "music", href: ROUTES.MUSIC, labelKey: "sectionMusic" },
] as const;

/** 타이핑 중인 역할 → 섹션 액센트(다크 변형은 --accent-* 변수가 자동 처리). 이름 매칭이라 순서 무관. */
const ROLE_ACCENT: Record<string, string> = {
  Developer: "var(--accent-dev)",
  Photographer: "var(--accent-photo)",
  Pianist: "var(--accent-music)",
};

/**
 * 랜딩 허브(/) — 이름(언어 무관 항상 "Sungjoon Lee") + 역할 타이핑(Photographer/Pianist/Developer)
 * + 소개 + 사진/음악/개발 진입. 타이핑 단어는 tagline 을 '·' 로 분해해 파생. 진입 애니메이션은 CSS 스태거.
 */
const LandingView = ({ site }: { site: SiteConfig }) => {
  const { dict, lang } = useLang();
  // useTyping 이 매 렌더 setText → 재렌더하므로, roles 배열 참조를 안정화(useMemo)해야 effect 가 재시작되지 않는다.
  const roles = useMemo(
    () =>
      pickText(site.tagline, lang)
        .split("·")
        .map((role) => role.trim())
        .filter(Boolean),
    [site.tagline, lang],
  );
  const { text: typed, index } = useTyping(roles);
  // 현재 타이핑 중인 역할의 색을 --role-accent 로 흘려보내면 이름의 '.'·타이핑·커서가 함께(스무스) 바뀐다.
  const roleAccent = ROLE_ACCENT[roles[index]] ?? "var(--accent)";

  return (
    <section className={styles.hero} style={{ "--role-accent": roleAccent } as CSSProperties}>
      <div className={styles.inner}>
        <h1 className={styles.name}>
          Sungjoon Lee<span className={styles.dot}>.</span>
        </h1>
        <div className={styles.type}>
          <span className={styles.typed}>{typed}</span>
          <span className={styles.cursor} aria-hidden="true" />
        </div>
        <p className={styles.lead}>{pickText(site.landingLead, lang)}</p>
        <nav className={styles.rows} aria-label="Sections">
          {SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className={styles.row}
              data-section={section.key}
            >
              <span className={styles.rowTitle}>{dict[section.labelKey]}</span>
              <span className={styles.rowCta} aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
};

export { LandingView };
