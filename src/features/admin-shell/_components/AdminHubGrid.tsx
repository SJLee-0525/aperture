"use client";

import Link from "next/link";

import type { ReactNode } from "react";

import styles from "./admin-hub.module.css";

type HubCard = {
  key: string;
  label: string;
  desc: string;
  href: string;
};

type Props = {
  title: string;
  /** 제목 아래 한 줄. 대시보드는 인사말, 섹션 허브는 안내 문구를 넣는다. */
  lead?: ReactNode;
  cards: HubCard[];
  /** 카드 우상단 배지 문구. */
};

/**
 * 관리자 허브의 카드 그리드.
 *
 * 카드는 항상 링크다. href 를 선택 항목으로 두면 링크 없는 카드를 실수로 만들 수 있다.
 */
const AdminHubGrid = ({ title, lead, cards }: Props) => (
  <div className={styles.page}>
    <header className={styles.head}>
      <h1 className={styles.title}>{title}</h1>
      {lead ? <p className={styles.hint}>{lead}</p> : null}
    </header>

    <div className={styles.grid}>
      {cards.map((card) => (
        <Link key={card.key} href={card.href} className={styles.card}>
          <span className={styles.badge}>관리 →</span>
          <h2 className={styles.cardTitle}>{card.label}</h2>
          <p className={styles.cardDesc}>{card.desc}</p>
        </Link>
      ))}
    </div>
  </div>
);

export { AdminHubGrid };
export type { HubCard };
