"use client";

import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { SocialGlyph } from "@/components/SocialGlyph";
import { CONTACT_NAV, MEGA_MENU } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
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
 *
 * @param {{ tagline: LocalizedText; links: SiteLink[]; privacyControls?: React.ReactNode }} props
 * @param {LocalizedText} props.tagline
 * @param {SiteLink[]} props.links
 * @param {React.ReactNode | undefined} props.privacyControls - 법적 문서 링크 옆에 주입할 쿠키 설정 UI.
 * @returns {JSX.Element}
 */
const SiteFooter = ({
  tagline,
  links,
  privacyControls,
}: {
  tagline: LocalizedText;
  links: SiteLink[];
  privacyControls?: React.ReactNode;
}) => {
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
              <LocalizedLink href={section.href} className={styles.colTitle}>
                {dict[section.labelKey]}
              </LocalizedLink>
              <ul className={styles.colLinks}>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <LocalizedLink href={link.href} className={styles.colLink}>
                      {dict[link.labelKey]}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className={styles.col} data-section="contact">
            <LocalizedLink href={CONTACT_NAV.href} className={styles.colTitle}>
              {dict[CONTACT_NAV.labelKey]}
            </LocalizedLink>
          </div>
        </nav>
      </div>

      <div className={styles.bottomInner}>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={styles.copyright}>
          © 2026 Sungjoon Lee · Seoul, Republic of Korea
          <GitHubIcon size={13} />
        </a>
        <div className={styles.legalLinks}>
          <LocalizedLink href={ROUTES.PRIVACY} className={styles.legalLink}>
            {dict.privacyNav}
          </LocalizedLink>
          <LocalizedLink href={ROUTES.TERMS} className={styles.legalLink}>
            {dict.termsNav}
          </LocalizedLink>
          <LocalizedLink href={ROUTES.ACCESSIBILITY} className={styles.legalLink}>
            {dict.accessibilityNav}
          </LocalizedLink>
          {privacyControls ? <span className={styles.legalControl}>{privacyControls}</span> : null}
        </div>
      </div>
    </footer>
  );
};

export { SiteFooter };
