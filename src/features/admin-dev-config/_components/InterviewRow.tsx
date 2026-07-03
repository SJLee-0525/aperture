"use client";

import type { DevInterview } from "@/types/dev";

import styles from "./InterviewRow.module.css";

type Props = {
  entry: DevInterview;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (index: number, field: "q" | "a", lang: "ko" | "en", value: string) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

/** 인터뷰 Q&A 한 항목 — 질문·답변(ko/en) 입력 + 위/아래 이동 + 삭제. */
const InterviewRow = ({ entry, index, isFirst, isLast, onEdit, onMove, onRemove }: Props) => (
  <li className={styles.row}>
    <div className={styles.inputs}>
      <div className={styles.grid2}>
        <input
          className={styles.input}
          value={entry.q.ko}
          placeholder="질문 (한국어)"
          onChange={(e) => onEdit(index, "q", "ko", e.target.value)}
        />
        <input
          className={styles.input}
          value={entry.q.en}
          placeholder="Question (English)"
          onChange={(e) => onEdit(index, "q", "en", e.target.value)}
        />
      </div>
      <div className={styles.grid2}>
        <textarea
          className={styles.textarea}
          rows={3}
          value={entry.a.ko}
          placeholder="답변 (한국어)"
          onChange={(e) => onEdit(index, "a", "ko", e.target.value)}
        />
        <textarea
          className={styles.textarea}
          rows={3}
          value={entry.a.en}
          placeholder="Answer (English)"
          onChange={(e) => onEdit(index, "a", "en", e.target.value)}
        />
      </div>
    </div>

    <div className={styles.controls}>
      <button
        type="button"
        className={styles.move}
        aria-label="위로"
        disabled={isFirst}
        onClick={() => onMove(index, -1)}
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.move}
        aria-label="아래로"
        disabled={isLast}
        onClick={() => onMove(index, 1)}
      >
        ↓
      </button>
      <button type="button" className={styles.delete} onClick={() => onRemove(index)}>
        삭제
      </button>
    </div>
  </li>
);

export { InterviewRow };
