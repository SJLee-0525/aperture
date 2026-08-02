"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import type { DevConfig } from "@/types/dev";

import styles from "./DevStackView.module.css";

/** 기술 스택 (/dev) — 카테고리별 칩 그룹. 히어로 없음(타이핑은 랜딩). */
const DevStackView = ({ config }: { config: DevConfig }) => {
  const { dict } = useLang();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.devStackNav}</h1>
      {config.stack.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.groups}>
          {config.stack.map((group) => (
            <div key={group.category} className={styles.group}>
              <div className="u-label">{group.category}</div>
              <div className={styles.chips}>
                {group.items.map((item) => (
                  <Link
                    key={item.name}
                    href={`${ROUTES.SEARCH}?q=${encodeURIComponent(item.name)}`}
                    prefetch={false}
                    className={styles.chip}
                    style={{ background: item.bg, color: item.fg, borderColor: item.bg }}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export { DevStackView };
