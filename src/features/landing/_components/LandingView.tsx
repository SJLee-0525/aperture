"use client";

import { m } from "motion/react";
import Link from "next/link";
import { type CSSProperties, Fragment, useEffect, useMemo, useState } from "react";

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

const EASE = [0.22, 1, 0.36, 1] as const;
/** 진입 전(started=false)엔 타이핑을 멈춰 둔다 — 안정 참조여야 effect 재시작 안 함. */
const NO_ROLES: string[] = [];

/** 이름 = 단어 단위로 묶어 좁은 화면에서 단어 중간 줄바꿈 방지(글자별 스태거는 유지). */
const NAME_WORDS = ["Sungjoon", "Lee"];
const NAME_CHAR_COUNT = NAME_WORDS.join("").length;

/* 진입 타임라인(초) — started 시점 기준: 글자 캐스케이드 → 마침표 낙하·바운스 → 소개·행 순차. */
const NAME_DELAY = 0.05;
const CHAR_STAGGER = 0.04;
const CHAR_DUR = 0.62;
const BALL_DELAY = NAME_DELAY + (NAME_CHAR_COUNT - 1) * CHAR_STAGGER + CHAR_DUR * 0.45;
const BALL_DUR = 1.15;
const ROLE_DELAY = 0.55;
const REVEAL_DELAY = BALL_DELAY + 0.45;
const ROW_STAGGER = 0.09;

/* 마침표 = 공 낙하 → 착지 스쿼시 → 감쇠 바운스. 구간별 이징(낙하=ease-in, 반등=ease-out)이 중력감을 만든다. */
const BALL_KEYFRAMES = {
  y: [-220, 0, -78, 0, -24, 0],
  scaleY: [1, 0.55, 1.12, 0.74, 1.04, 1],
  scaleX: [1, 1.4, 0.9, 1.2, 0.97, 1],
};
const BALL_TIMES = [0, 0.3, 0.55, 0.72, 0.87, 1];
const BALL_EASE = [
  [0.55, 0, 1, 0.45],
  [0.15, 0.85, 0.3, 1],
  [0.55, 0, 1, 0.45],
  [0.15, 0.85, 0.3, 1],
  [0.55, 0, 1, 0.45],
] as [number, number, number, number][];

/* hidden/show 상태 — started 로 토글. */
const CHAR_HIDDEN = { opacity: 0, y: 30, filter: "blur(16px)" };
const CHAR_SHOW = { opacity: 1, y: 0, filter: "blur(0px)" };
const DOT_HIDDEN = { opacity: 0, y: -220 };
const DOT_SHOW = { opacity: 1, ...BALL_KEYFRAMES };

const MotionLink = m.create(Link);

/**
 * 진입 시작 신호. 하드 로드(첫 방문·새로고침)엔 IntroSplash 가 화면을 덮으므로,
 * 스플래시가 실제로 사라질 때(animationend)까지 애니메이션을 미룬다 — 스플래시에 가려 헛재생되는 걸 방지.
 * 소프트 내비(스플래시 없음·이미 사라짐)나 reduced-motion(스플래시 display:none)이면 즉시 시작.
 * 시간 하드코딩이 아니라 스플래시 존재/상태를 감지한다.
 */
const useIntroReady = (): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = () => setReady(true);
    const splash = document.querySelector<HTMLElement>("[data-intro-splash]");
    const cs = splash && getComputedStyle(splash);
    // 스플래시가 지금 화면을 덮고 있는가 (하드 로드) — 아니면(소프트 내비·생략) 바로 시작.
    const covering =
      !!cs && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0;
    if (!covering) {
      // 다음 프레임에 시작 — hidden 초기 상태를 한 번 그린 뒤 애니메이션(effect 본문 동기 setState 회피).
      const raf = requestAnimationFrame(start);
      return () => cancelAnimationFrame(raf);
    }
    // 하드 로드: 스플래시 디스미스가 끝나는 시점에 시작(시간 하드코딩 아님 — 실제 상태/이벤트 구독).
    splash.addEventListener("animationend", start, { once: true });
    // animationend 유실 대비 안전장치 — 스플래시 실제 지속시간에서 파생(여유 300ms).
    const fallback = window.setTimeout(
      start,
      (parseFloat(cs.animationDuration) || 1.4) * 1000 + 300,
    );
    return () => {
      splash.removeEventListener("animationend", start);
      window.clearTimeout(fallback);
    };
  }, []);
  return ready;
};

/**
 * 랜딩 허브(/) — 이름(언어 무관 항상 "Sungjoon Lee") + 역할 타이핑(Photographer/Pianist/Developer)
 * + 소개 + 사진/음악/개발 진입. 타이핑 단어는 tagline 을 '·' 로 분해해 파생.
 * 진입 애니메이션은 스플래시가 걷힌 뒤 시작: 글자가 블러에서 선명해지며 액센트색으로 떠올랐다 본문색으로 안착 →
 * 마침표가 공처럼 튀어들어와(역할 색을 따라 변색) → 역할·소개·섹션 행이 순차로 등장.
 */
const LandingView = ({ site }: { site: SiteConfig }) => {
  const { dict, lang } = useLang();
  const started = useIntroReady();
  // useTyping 이 매 렌더 setText → 재렌더하므로, roles 배열 참조를 안정화(useMemo)해야 effect 가 재시작되지 않는다.
  const roles = useMemo(
    () =>
      pickText(site.tagline, lang)
        .split("·")
        .map((role) => role.trim())
        .filter(Boolean),
    [site.tagline, lang],
  );
  // 진입 시작 전엔 타이핑을 멈춰 스플래시에 가린 채 진행되지 않게 → 등장과 동시에 처음부터 타이핑.
  const { text: typed, index } = useTyping(started ? roles : NO_ROLES);
  // 현재 타이핑 중인 역할의 색을 --role-accent 로 흘려보내면 이름의 '.'·타이핑·커서가 함께(스무스) 바뀐다.
  const roleAccent = ROLE_ACCENT[roles[index]] ?? "var(--accent)";

  let charIndex = 0;

  return (
    <section className={styles.hero} style={{ "--role-accent": roleAccent } as CSSProperties}>
      <div className={styles.inner}>
        <h1 className={styles.name} aria-label="Sungjoon Lee.">
          {NAME_WORDS.map((word, wordIndex) => {
            const isLast = wordIndex === NAME_WORDS.length - 1;
            return (
              <Fragment key={word}>
                {wordIndex > 0 ? " " : null}
                <span className={styles.word}>
                  {[...word].map((char) => {
                    const delay = NAME_DELAY + charIndex * CHAR_STAGGER;
                    charIndex += 1;
                    return (
                      <m.span
                        key={`${word}-${delay}`}
                        className={`${styles.char}${started ? ` ${styles.charFlash}` : ""}`}
                        aria-hidden="true"
                        initial={CHAR_HIDDEN}
                        animate={started ? CHAR_SHOW : CHAR_HIDDEN}
                        transition={{ duration: CHAR_DUR, ease: EASE, delay }}
                        style={{ animationDelay: `${delay}s` }}
                      >
                        {char}
                      </m.span>
                    );
                  })}
                  {isLast ? (
                    <m.span
                      className={styles.dot}
                      aria-hidden="true"
                      initial={DOT_HIDDEN}
                      animate={started ? DOT_SHOW : DOT_HIDDEN}
                      transition={{
                        delay: BALL_DELAY,
                        duration: BALL_DUR,
                        times: BALL_TIMES,
                        ease: BALL_EASE,
                        opacity: { delay: BALL_DELAY, duration: 0.01 },
                      }}
                    >
                      .
                    </m.span>
                  ) : null}
                </span>
              </Fragment>
            );
          })}
        </h1>

        <m.div
          className={styles.type}
          initial={{ opacity: 0, y: 14 }}
          animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.5, ease: EASE, delay: ROLE_DELAY }}
        >
          <span className={styles.typed}>{typed}</span>
          <span className={styles.cursor} aria-hidden="true" />
        </m.div>

        <m.p
          className={styles.lead}
          initial={{ opacity: 0, y: 16 }}
          animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: EASE, delay: REVEAL_DELAY }}
        >
          {pickText(site.landingLead, lang)}
        </m.p>

        <nav className={styles.rows} aria-label="Sections">
          {SECTIONS.map((section, i) => (
            <MotionLink
              key={section.key}
              href={section.href}
              className={styles.row}
              data-section={section.key}
              initial={{ opacity: 0, y: 16 }}
              animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{
                duration: 0.5,
                ease: EASE,
                delay: REVEAL_DELAY + 0.1 + i * ROW_STAGGER,
              }}
            >
              <span className={styles.rowTitle}>{dict[section.labelKey]}</span>
              <span className={styles.rowCta} aria-hidden="true">
                ↗
              </span>
            </MotionLink>
          ))}
        </nav>
      </div>
    </section>
  );
};

export { LandingView };
