"use client";

import { AdminInput } from "@/components/AdminInput";
import { Icon } from "@/components/Icon";
import row from "@/features/admin-shell/_components/admin-row.module.css";

import type { TimelineEntry } from "@/types/timeline";

import styles from "./DevTimelineRow.module.css";

type Props = {
  entry: TimelineEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEditPeriod: (index: number, value: string) => void;
  onEditTitle: (index: number, lang: "ko" | "en", value: string) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

/**
 * 개발 학력 한 행 — 기간 + 제목(ko/en) + 정렬/삭제.
 */
const DevEducationRow = ({
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
      <AdminInput
        size="sm"
        aria-label="학력 기간"
        name={`education.${index}.period`}
        autoComplete="off"
        value={entry.period}
        placeholder="2024 — 2025"
        onChange={(event) => onEditPeriod(index, event.target.value)}
      />
      <div className={styles.grid2}>
        <AdminInput
          size="sm"
          aria-label="학력 (한국어)"
          name={`education.${index}.title.ko`}
          autoComplete="off"
          value={entry.title.ko}
          placeholder="학력 (한국어)"
          onChange={(event) => onEditTitle(index, "ko", event.target.value)}
        />
        <AdminInput
          size="sm"
          aria-label="Education (English)"
          name={`education.${index}.title.en`}
          autoComplete="off"
          value={entry.title.en}
          placeholder="Education (English)"
          onChange={(event) => onEditTitle(index, "en", event.target.value)}
        />
      </div>
    </div>
    <div className={styles.controls}>
      <button
        type="button"
        className={row.move}
        aria-label="위로"
        disabled={isFirst}
        onClick={() => onMove(index, -1)}
      >
        <Icon name="arrowUp" size={14} />
      </button>
      <button
        type="button"
        className={row.move}
        aria-label="아래로"
        disabled={isLast}
        onClick={() => onMove(index, 1)}
      >
        <Icon name="arrowDown" size={14} />
      </button>
      <button type="button" className={row.delete} onClick={() => onRemove(index)}>
        삭제
      </button>
    </div>
  </li>
);

export { DevEducationRow };
