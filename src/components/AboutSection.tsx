"use client";

import { m } from "motion/react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";

import { CountUp } from "@/components/CountUp";
import { ROUTES } from "@/constants/routes";

import styles from "./AboutSection.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const DEFAULT_COLLAPSED_ITEM_COUNT = 7;
/** 블록이 순번대로 아래에서 떠오름 (custom = 순번). */
const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.1 },
  }),
};

type Stat = { value: number; label: string };
type Col = { label: string; items: string[] };

type Props = {
  /** 액센트 eyebrow (섹션 역할 라벨 — "Aperture."·"Pianist"·"Developer"). */
  eyebrow: string;
  /** 요약 헤드라인 (bio/intro 첫 문장 파생). */
  summary: string;
  /** 본문 (요약 이후 문단). 없으면 렌더 안 함. */
  body: string;
  /** 숫자 통계 (CountUp) — 보통 4개. */
  stats: Stat[];
  /** 파생 목록 2열. */
  cols: Col[];
  /** 각 목록을 접었을 때 노출할 항목 수. */
  collapsedItemCount?: number;
  /** 목록 펼침 토글 라벨 — ko/en 사전은 각 섹션 뷰(features)가 소비하고 여기는 props only. */
  showMoreLabel: string;
  showLessLabel: string;
  /** 섹션 하단 추가 콘텐츠 (예: 개발 소개의 인터뷰 Q&A). */
  children?: ReactNode;
};

/**
 * 소개 공통 레이아웃 — 사진·음악·개발 소개가 공유하는 히어로+통계+목록 블록.
 * 데이터 파생(통계·목록 계산)은 각 섹션 뷰가 하고, 여기는 표시만(props only).
 */
const AboutSection = ({
  eyebrow,
  summary,
  body,
  stats,
  cols,
  collapsedItemCount = DEFAULT_COLLAPSED_ITEM_COUNT,
  showMoreLabel,
  showLessLabel,
  children,
}: Props) => {
  const colsId = useId();
  const [expanded, setExpanded] = useState(false);
  const expandable = cols.some((col) => col.items.length > collapsedItemCount);
  const controlledListIds = cols.map((_, index) => `${colsId}-${index}`).join(" ");

  return (
    <main className={styles.about}>
      <m.header
        className={styles.hero}
        custom={0}
        variants={FADE_UP}
        initial="hidden"
        animate="show"
      >
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.name}>{summary}</h1>
        {body ? <p className={styles.bio}>{body}</p> : null}
      </m.header>

      {stats.length > 0 ? (
        <m.div
          className={styles.stats}
          custom={1}
          variants={FADE_UP}
          initial="hidden"
          animate="show"
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className={styles.sn}>
                <CountUp value={stat.value} />
              </div>
              <div className={styles.sl}>{stat.label}</div>
            </div>
          ))}
        </m.div>
      ) : null}

      {cols.length > 0 ? (
        <m.div
          className={styles.cols}
          custom={2}
          variants={FADE_UP}
          initial="hidden"
          animate="show"
        >
          {cols.map((col, index) => {
            const visibleItems = expanded ? col.items : col.items.slice(0, collapsedItemCount);

            return (
              <div key={col.label}>
                <div className="u-label">{col.label}</div>
                <ul id={`${colsId}-${index}`} className={styles.list}>
                  {visibleItems.map((item) => (
                    <li key={item}>
                      <Link prefetch={false} href={{ pathname: ROUTES.SEARCH, query: { q: item } }}>
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {expandable ? (
            <div className={styles.toggleRow}>
              <button
                className={styles.toggle}
                type="button"
                aria-expanded={expanded}
                aria-controls={controlledListIds}
                onClick={() => setExpanded((current) => !current)}
              >
                <span>{expanded ? showLessLabel : showMoreLabel}</span>
                <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true">
                  <g className={styles.chevronGlyph}>
                    <path d="m4 6 4 4 4-4" />
                  </g>
                </svg>
              </button>
            </div>
          ) : null}
        </m.div>
      ) : null}

      {children}
    </main>
  );
};

export { AboutSection };
