"use client";

import type { UIDict } from "@/constants/dictionary";
import { useLang } from "@/features/lang/use-lang";

import styles from "./ComingSoon.module.css";

/**
 * 임시 섹션 플레이스홀더 — 음악(Phase B)·개발(Phase C) 정식 뷰로 교체된다.
 * 섹션 진입이 404가 아니게 하고 섹션 액센트 전환을 확인 가능하게 하는 용도.
 */
const ComingSoon = ({ titleKey }: { titleKey: keyof UIDict }) => {
  const { dict } = useLang();
  return (
    <section className={styles.wrap}>
      <h1 className={styles.title}>{dict[titleKey]}</h1>
      <p className={styles.sub}>{dict.comingSoon}</p>
    </section>
  );
};

export { ComingSoon };
