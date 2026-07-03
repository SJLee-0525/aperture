"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { SiteConfig } from "@/types/site";

import styles from "./LandingView.module.css";

/** 랜딩 진입 행 — 각 섹션의 액센트를 미리 보여준다(hover 채움). */
const SECTIONS = [
  { key: "photo", href: ROUTES.PHOTO, labelKey: "sectionPhoto" },
  { key: "music", href: ROUTES.MUSIC, labelKey: "sectionMusic" },
  { key: "dev", href: ROUTES.DEV, labelKey: "sectionDev" },
] as const;

/**
 * 랜딩 허브(/) — 이름·태그라인·소개 + 사진/음악/개발 진입. 진입 애니메이션은 CSS 스태거(fade-up).
 * 콘텐츠는 site/config(name·tagline·landingLead)에서 온다.
 */
const LandingView = ({ site }: { site: SiteConfig }) => {
  const { dict, lang } = useLang();

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{pickText(site.tagline, lang)}</p>
        <h1 className={styles.name}>
          {pickText(site.name, lang)}
          <span className={styles.dot}>.</span>
        </h1>
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
