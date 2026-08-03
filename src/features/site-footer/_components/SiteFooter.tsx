"use client";

import Link from "next/link";

import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { SocialGlyph } from "@/components/SocialGlyph";
import { CONTACT_NAV, MEGA_MENU } from "@/constants/navigation";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

import styles from "./SiteFooter.module.css";

/** 사이트 제작·소유자 GitHub — 콘텐츠가 아닌 고정 크레딧이라 컴포넌트 상수 */
const GITHUB_URL = "https://github.com/SJLee-0525";

/**
 * 전역 푸터 — 상단: 브랜드 블록(워드마크 + 태그라인 + 연락 아이콘) + 사이트맵(mega-menu와 동일 출처),
 * 하단: © + 조용한 GitHub 크레딧. 공개 레이아웃 하단에만 마운트, links·tagline은 site/config에서 주입.
 */
const SiteFooter = ({ tagline, links }: { tagline: LocalizedText; links: SiteLink[] }) => {
  const { dict, lang } = useLang();

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>
            Sungjoon Lee<span className={styles.dot}>.</span>
          </span>
          <p className={styles.tagline}>{pickText(tagline, lang)}</p>
          <div className={styles.socials}>
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={styles.social}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                aria-label={link.label}
                title={link.label}
              >
                <SocialGlyph label={link.label} size={16} />
              </a>
            ))}
          </div>
        </div>

        <nav className={styles.sitemap} aria-label={dict.footerSitemapLabel}>
          {MEGA_MENU.map((section) => (
            <div key={section.section} className={styles.col} data-section={section.section}>
              <Link href={section.href} className={styles.colTitle}>
                {dict[section.labelKey]}
              </Link>
              <ul className={styles.colLinks}>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.colLink}>
                      {dict[link.labelKey]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className={styles.col} data-section="contact">
            <Link href={CONTACT_NAV.href} className={styles.colTitle}>
              {dict[CONTACT_NAV.labelKey]}
            </Link>
          </div>
        </nav>
      </div>

      <div className={styles.bottomInner}>
        <span className={styles.copyright}>© 2026 Sungjoon Lee · Seoul, Republic of Korea</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub — SJLee-0525"
          className={styles.credit}
        >
          Built by SJLee-0525
          <GitHubIcon size={13} />
        </a>
      </div>
    </footer>
  );
};

export { SiteFooter };
