"use client";

import { type CSSProperties, Fragment } from "react";

import styles from "./RevealWords.module.css";

/**
 * 어절 단위 마스크 리빌 — 각 단어를 overflow 마스크에 넣고 아래에서 밀어 올린다.
 * 지연은 CSS 변수(--word-delay)로 넘겨 motion 노드를 단어 수만큼 만들지 않는다(랜딩 행 리빌과 동일 방식).
 * key 는 인덱스 고정 — 언어 전환처럼 텍스트만 바뀌는 재렌더에서 DOM 이 재사용돼 애니메이션이 다시 재생되지 않는다.
 */
const RevealWords = ({
  className,
  delay = 0,
  stagger = 0.035,
  started,
  text,
}: {
  className?: string;
  delay?: number;
  stagger?: number;
  started: boolean;
  text: string;
}) => (
  <p className={className}>
    {text
      .split(/\s+/)
      .filter(Boolean)
      .map((word, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : null}
          <span className={styles.mask}>
            <span
              className={`${styles.word} ${started ? styles.wordVisible : ""}`}
              style={{ "--word-delay": `${delay + i * stagger}s` } as CSSProperties}
            >
              {word}
            </span>
          </span>
        </Fragment>
      ))}
  </p>
);

export { RevealWords };
