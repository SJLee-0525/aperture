"use client";

import { m, useReducedMotion } from "motion/react";
import { type CSSProperties, memo, type RefObject, useEffect, useMemo, useRef } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useIntroDelay } from "@/features/landing/_hooks/use-intro-delay";
import { useIntroReady } from "@/features/landing/_hooks/use-intro-ready";
import { useSectionGlow } from "@/features/landing/_hooks/use-section-glow";
import { useTyping } from "@/features/landing/_hooks/use-typing";
import { useLang } from "@/features/lang/_hooks/use-lang";

import { LANDING_EASE, LANDING_REVEAL_DELAY } from "@/features/landing/_lib/landing-motion";

import { ROUTES } from "@/constants/routes";
import { pickText } from "@/lib/i18n/pick-text";

import type { UIDict } from "@/constants/dictionary";
import type { LocalizedText } from "@/types/localized";

import { AnimatedWordmark } from "./AnimatedWordmark";
import styles from "./LandingView.module.css";
import { RevealWords } from "./RevealWords";

/** 사진, 음악, 개발 섹션으로 이동하는 행. */
const SECTIONS = [
  { key: "dev", href: ROUTES.DEV_PROJECTS, labelKey: "sectionDev" },
  { key: "photo", href: ROUTES.PHOTO, labelKey: "sectionPhoto" },
  { key: "music", href: ROUTES.MUSIC, labelKey: "sectionMusic" },
] as const;

/** 타이핑 중인 역할에 적용할 섹션 액센트. */
const ROLE_ACCENT: Record<string, string> = {
  Developer: "var(--accent-dev)",
  Photographer: "var(--accent-photo)",
  Pianist: "var(--accent-music)",
};

/** 진입 애니메이션 전에는 타이핑을 멈춘다. */
const NO_ROLES: string[] = [];

/* 진입 애니메이션의 단계별 시작 시각. */
const ROLE_DELAY = 0.55;
const ROW_STAGGER = 0.09;

/**
 * 타이핑 상태와 역할 색상 갱신을 랜딩의 정적 콘텐츠에서 격리한다.
 *
 * @param {{ accentRef: RefObject<HTMLElement | null>; reducedMotion: boolean | null; roles: string[]; started: boolean; }} props
 * @param {RefObject<HTMLElement | null>} props.accentRef
 * @param {boolean | null} props.reducedMotion
 * @param {string[]} props.roles
 * @param {boolean} props.started
 * @returns {JSX.Element}
 */
const LandingTyping = ({
  accentRef,
  reducedMotion,
  roles,
  started,
}: {
  accentRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean | null;
  roles: string[];
  started: boolean;
}) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const { text: typed, index } = useTyping(started ? roles : NO_ROLES, lineRef);
  const roleAccent = ROLE_ACCENT[roles[index]] ?? "var(--accent)";

  useEffect(() => {
    accentRef.current?.style.setProperty("--role-accent", roleAccent);
  }, [accentRef, roleAccent]);

  return (
    <m.div
      ref={lineRef}
      className={styles.type}
      initial={{ opacity: 0, y: 14 }}
      animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.5, ease: LANDING_EASE, delay: ROLE_DELAY }
      }
    >
      <span className={styles.typed}>{typed}</span>
      <span className={styles.cursor} aria-hidden="true" />
    </m.div>
  );
};

/** 역할 타이핑과 분리된 정적 탐색 영역. */
const LandingNav = memo(
  ({
    dict,
    onRowEnter,
    onRowLeave,
    started,
  }: {
    dict: UIDict;
    onRowEnter: (event: { currentTarget: HTMLElement }) => void;
    onRowLeave: () => void;
    started: boolean;
  }) => (
    <nav className={styles.rows} aria-label={dict.sectionsLabel}>
      {SECTIONS.map((section, i) => (
        <LocalizedLink
          key={section.key}
          href={section.href}
          className={`${styles.row} ${started ? styles.rowVisible : ""}`}
          data-section={section.key}
          onPointerEnter={onRowEnter}
          onPointerLeave={onRowLeave}
          onFocus={onRowEnter}
          onBlur={onRowLeave}
          style={
            {
              "--row-delay": `${LANDING_REVEAL_DELAY + 0.1 + i * ROW_STAGGER}s`,
            } as CSSProperties
          }
        >
          <span className={styles.rowTitle}>{dict[section.labelKey]}</span>
          <span className={styles.rowCta} aria-hidden="true">
            ↗
          </span>
        </LocalizedLink>
      ))}
    </nav>
  ),
);

LandingNav.displayName = "LandingNav";

/**
 * 이름과 역할 타이핑, 소개, 섹션 링크를 보여 주는 랜딩 화면.
 * 역할은 tagline을 가운뎃점으로 나눠 만들며 스플래시가 끝난 뒤 애니메이션을 시작한다.
 *
 * @param {{ tagline: LocalizedText; landingLead: LocalizedText }} props
 * @param {LocalizedText} props.tagline 역할 목록을 만드는 다국어 문구.
 * @param {LocalizedText} props.landingLead
 * @returns {JSX.Element}
 */
const LandingView = ({
  tagline,
  landingLead,
}: {
  /** 랜딩에 필요한 site/config 필드만 받는다. */
  tagline: LocalizedText;
  landingLead: LocalizedText;
}) => {
  const { dict, lang } = useLang();
  const reducedMotion = useReducedMotion();
  const started = useIntroReady();
  const leadDelay = useIntroDelay(started, LANDING_REVEAL_DELAY);
  const accentRef = useRef<HTMLElement>(null);
  const { onRowEnter, onRowLeave } = useSectionGlow(accentRef);
  // roles 참조를 유지해 useTyping effect가 불필요하게 다시 시작되지 않게 한다.
  const roles = useMemo(
    () =>
      pickText(tagline, lang)
        .split("·")
        .map((role) => role.trim())
        .filter(Boolean),
    [tagline, lang],
  );
  const initialRoleAccent = ROLE_ACCENT[roles[0]] ?? "var(--accent)";

  return (
    <main
      ref={accentRef}
      className={styles.hero}
      style={{ "--role-accent": initialRoleAccent } as CSSProperties}
    >
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        <AnimatedWordmark started={started} />

        <LandingTyping
          accentRef={accentRef}
          reducedMotion={reducedMotion}
          roles={roles}
          started={started}
        />

        <RevealWords
          className={styles.lead}
          delay={leadDelay}
          started={started}
          text={pickText(landingLead, lang)}
        />

        <LandingNav dict={dict} onRowEnter={onRowEnter} onRowLeave={onRowLeave} started={started} />
      </div>
    </main>
  );
};

export { LandingNav, LandingView };
