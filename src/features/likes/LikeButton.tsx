"use client";

import { useLike } from "@/features/likes/use-like";

import styles from "./LikeButton.module.css";

type Props = {
  initialLikes: number;
  /** 사진 위에 얹을 때(글래스 배경) */
  glass?: boolean;
};

/** 좋아요 하트 + 카운트. likes≥1이면 빨강 채움. 증가 전용(P1 로컬). 사진별 key로 사용할 것. */
const LikeButton = ({ initialLikes, glass = false }: Props) => {
  const { likes, like, filled } = useLike(initialLikes);

  return (
    <button
      type="button"
      onClick={like}
      aria-label="Like"
      className={`${styles.like} ${glass ? styles.glass : ""} ${filled ? styles.filled : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z" />
      </svg>
      <span className={styles.count}>{likes}</span>
    </button>
  );
};

export { LikeButton };
