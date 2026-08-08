"use client";

import { m, useReducedMotion } from "motion/react";
import { type CSSProperties, memo, type RefObject, useEffect, useMemo, useRef } from "react";

import type { UIDict } from "@/constants/dictionary";
import { ROUTES } from "@/constants/routes";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useIntroDelay } from "@/features/landing/_hooks/use-intro-delay";
import { useIntroReady } from "@/features/landing/_hooks/use-intro-ready";
import { useSectionGlow } from "@/features/landing/_hooks/use-section-glow";
import { LANDING_EASE, LANDING_REVEAL_DELAY } from "@/features/landing/_lib/landing-motion";
import { useTyping } from "@/hooks/use-typing";
import { pickText } from "@/lib/i18n/pick-text";
import type { LocalizedText } from "@/types/localized";

import { AnimatedWordmark } from "./AnimatedWordmark";
import styles from "./LandingView.module.css";
import { RevealWords } from "./RevealWords";

/** 랜딩 진입 행 — 각 섹션의 액센트를 미리 보여준다(hover 채움). */
const SECTIONS = [
  { key: "dev", href: ROUTES.DEV_PROJECTS, labelKey: "sectionDev" },
  { key: "photo", href: ROUTES.PHOTO, labelKey: "sectionPhoto" },
  { key: "music", href: ROUTES.MUSIC, labelKey: "sectionMusic" },
] as const;

/** 타이핑 중인 역할 → 섹션 액센트(다크 변형은 --accent-* 변수가 자동 처리). 이름 매칭이라 순서 무관. */
const ROLE_ACCENT: Record<string, string> = {
  Developer: "var(--accent-dev)",
  Photographer: "var(--accent-photo)",
  Pianist: "var(--accent-music)",
};

/** 진입 전(started=false)엔 타이핑을 멈춰 둔다 — 안정 참조여야 effect 재시작 안 함. */
const NO_ROLES: string[] = [];

/* 진입 타임라인(초) — started 시점 기준: 글자 캐스케이드 → 마침표 낙하·바운스 → 소개·행 순차. */
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
  const { text: typed, index } = useTyping(started ? roles : NO_ROLES);
  const roleAccent = ROLE_ACCENT[roles[index]] ?? "var(--accent)";

  useEffect(() => {
    accentRef.current?.style.setProperty("--role-accent", roleAccent);
  }, [accentRef, roleAccent]);

  return (
    <m.div
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

/** 타이핑 프레임과 무관한 정적 탐색 영역. started가 바뀔 때 한 번만 갱신한다. */
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
 * 랜딩 허브(/) — 이름(언어 무관 항상 "Sungjoon Lee") + 역할 타이핑(Photographer/Pianist/Developer)
 * + 소개 + 사진/음악/개발 진입. 타이핑 단어는 tagline 을 '·' 로 분해해 파생.
 * 진입 애니메이션은 스플래시가 걷힌 뒤 시작: 글자가 블러에서 선명해지며 액센트색으로 떠올랐다 본문색으로 안착 →
 * 마침표가 공처럼 튀어들어와(역할 색을 따라 변색) → 역할·소개(어절 리빌)·섹션 행이 순차로 등장.
 * 배경 글로우는 평소 우상단에서 역할 색으로 느리게 부유하다가, 섹션 행에 포인터·포커스가 닿으면
 * 그 행 한가운데로 옮겨가며 섹션 액센트로 물든다(위치는 실측, 색·세기는 CSS `:has()`).
 *
 * @param {{ tagline: LocalizedText; landingLead: LocalizedText }} props
 * @param {LocalizedText} props.tagline - site/config 중 랜딩이 소비하는 두 필드만 — 전체 SiteConfig(태그 사전·bio·links)를 직렬화하지 않는다.
 * @param {LocalizedText} props.landingLead
 * @returns {JSX.Element}
 */
const LandingView = ({
  tagline,
  landingLead,
}: {
  /** site/config 중 랜딩이 소비하는 두 필드만 — 전체 SiteConfig(태그 사전·bio·links)를 직렬화하지 않는다. */
  tagline: LocalizedText;
  landingLead: LocalizedText;
}) => {
  const { dict, lang } = useLang();
  const reducedMotion = useReducedMotion();
  const started = useIntroReady();
  const leadDelay = useIntroDelay(started, LANDING_REVEAL_DELAY);
  const accentRef = useRef<HTMLElement>(null);
  const { onRowEnter, onRowLeave } = useSectionGlow(accentRef);
  // useTyping 이 매 렌더 setText → 재렌더하므로, roles 배열 참조를 안정화(useMemo)해야 effect 가 재시작되지 않는다.
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
