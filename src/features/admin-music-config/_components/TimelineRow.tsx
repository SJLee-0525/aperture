"use client";

import { Icon } from "@/components/Icon";

import type { TimelineKey } from "@/features/admin-music-config/_hooks/use-music-config-admin";
import type { TimelineEntry } from "@/types/timeline";

import styles from "./TimelineRow.module.css";

type Props = {
  groupKey: TimelineKey;
  entry: TimelineEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEditPeriod: (key: TimelineKey, index: number, value: string) => void;
  onEditTitle: (key: TimelineKey, index: number, field: "ko" | "en", value: string) => void;
  onMove: (key: TimelineKey, index: number, offset: -1 | 1) => void;
  onRemove: (key: TimelineKey, index: number) => void;
};

/**
 * 경력/학력 타임라인 한 행 — 기간 + 제목(ko/en) 입력 + 위/아래 이동 + 삭제.
 *
 * @param {Props} props
 * @param {TimelineKey} props.groupKey
 * @param {TimelineEntry} props.entry
 * @param {number} props.index
 * @param {boolean} props.isFirst
 * @param {boolean} props.isLast
 * @param {(key: TimelineKey, index: number, value: string) => void} props.onEditPeriod
 * @param {(key: TimelineKey, index: number, field: 'ko' | 'en', value: string) => void} props.onEditTitle
 * @param {(key: TimelineKey, index: number, offset: -1 | 1) => void} props.onMove
 * @param {(key: TimelineKey, index: number) => void} props.onRemove
 * @returns {JSX.Element}
 */
const TimelineRow = ({
  groupKey,
  entry,
  index,
  isFirst,
  isLast,
  onEditPeriod,
  onEditTitle,
  onMove,
  onRemove,
}: Props) => (
  <li className={styles.row}>
    <div className={styles.inputs}>
      <label className={styles.field}>
        <span className={styles.srLabel}>기간</span>
        <input
          className={styles.input}
          value={entry.period}
          placeholder="2020 – 2024"
          onChange={(e) => onEditPeriod(groupKey, index, e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.srLabel}>제목 (한국어)</span>
        <input
          className={styles.input}
          value={entry.title.ko}
          placeholder="제목 (한국어)"
          onChange={(e) => onEditTitle(groupKey, index, "ko", e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.srLabel}>제목 (English)</span>
        <input
          className={styles.input}
          value={entry.title.en}
          placeholder="Title (English)"
          onChange={(e) => onEditTitle(groupKey, index, "en", e.target.value)}
        />
      </label>
    </div>

    <div className={styles.controls}>
      <button
        type="button"
        className={styles.move}
        aria-label="위로"
        disabled={isFirst}
        onClick={() => onMove(groupKey, index, -1)}
      >
        <Icon name="arrowUp" size={14} />
      </button>
      <button
        type="button"
        className={styles.move}
        aria-label="아래로"
        disabled={isLast}
        onClick={() => onMove(groupKey, index, 1)}
      >
        <Icon name="arrowDown" size={14} />
      </button>
      <button type="button" className={styles.delete} onClick={() => onRemove(groupKey, index)}>
        삭제
      </button>
    </div>
  </li>
);

export { TimelineRow };
