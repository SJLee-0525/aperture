"use client";

import { m } from "motion/react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";

import { CountUp } from "@/components/CountUp";

import { ROUTES } from "@/constants/routes";
import { localizePath } from "@/lib/i18n/locale-path";

import type { Lang } from "@/types/lang";

import styles from "./AboutSection.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const DEFAULT_COLLAPSED_ITEM_COUNT = 7;
/** 순번에 따라 블록 진입 시간을 늦춘다. */
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
  /** 검색 링크의 로케일을 정할 현재 언어. */
  lang: Lang;
  /** 섹션 역할을 표시하는 액센트 라벨. */
  eyebrow: string;
  /** 소개 첫 문장에서 만든 요약 제목. */
  summary: string;
  /** 요약 뒤에 표시할 본문. */
  body: string;
  /** CountUp으로 표시할 숫자 통계. */
  stats: Stat[];
  /** 두 열로 표시할 목록. */
  cols: Col[];
  /** 각 목록을 접었을 때 노출할 항목 수. */
  collapsedItemCount?: number;
  /** 목록 펼치기와 접기 버튼의 라벨. */
  showMoreLabel: string;
  showLessLabel: string;
  /** 섹션 하단 추가 콘텐츠 (예: 개발 소개의 인터뷰 Q&A). */
  children?: ReactNode;
};

/**
 * 사진, 음악, 개발 소개 화면이 공유하는 레이아웃.
 * 통계와 목록은 각 섹션에서 계산해 전달한다.
 *
 * @param {Props} props
 * @param {Lang} props.lang 검색 링크에 사용할 현재 언어.
 * @param {string} props.eyebrow 섹션 역할 라벨.
 * @param {string} props.summary 소개 요약 제목.
 * @param {string} props.body 요약 뒤에 표시할 본문.
 * @param {Stat[]} props.stats 숫자 통계.
 * @param {Col[]} props.cols 두 열로 표시할 목록.
 * @param {number | undefined} props.collapsedItemCount - 각 목록을 접었을 때 노출할 항목 수.
 * @param {string} props.showMoreLabel 목록 펼치기 버튼 라벨.
 * @param {string} props.showLessLabel
 * @param {ReactNode} props.children 섹션 아래에 표시할 추가 콘텐츠.
 * @returns {JSX.Element}
 */
const AboutSection = ({
  lang,
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
                      <Link
                        prefetch={false}
                        href={{ pathname: localizePath(lang, ROUTES.SEARCH), query: { q: item } }}
                      >
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
