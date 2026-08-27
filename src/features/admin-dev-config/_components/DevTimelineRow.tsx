"use client";

import { AdminInput } from "@/components/AdminInput";
import { Icon } from "@/components/Icon";
import row from "@/features/admin-shell/_components/admin-row.module.css";

import type { DevTimelineEntry } from "@/types/dev";

import styles from "./DevTimelineRow.module.css";

/** ko/en 이중언어 필드 키 (period 제외). */
type LocalizedField = "title" | "role" | "desc";

type Props = {
  entry: DevTimelineEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEditPeriod: (index: number, value: string) => void;
  onEditField: (index: number, field: LocalizedField, lang: "ko" | "en", value: string) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

const FIELDS: { key: LocalizedField; label: string }[] = [
  { key: "title", label: "제목" },
  { key: "role", label: "역할" },
  { key: "desc", label: "설명" },
];

/**
 * 경력 타임라인 한 행 — 기간 + 제목·역할·설명(ko/en) + 위/아래 이동 + 삭제.
 *
 * @param {Props} props
 * @param {DevTimelineEntry} props.entry
 * @param {number} props.index
 * @param {boolean} props.isFirst
 * @param {boolean} props.isLast
 * @param {(index: number, value: string) => void} props.onEditPeriod
 * @param {(index: number, field: LocalizedField, lang: 'ko' | 'en', value: string) => void} props.onEditField
 * @param {(index: number, offset: -1 | 1) => void} props.onMove
 * @param {(index: number) => void} props.onRemove
 * @returns {JSX.Element}
 */
const DevTimelineRow = ({
  entry,
  index,
  isFirst,
  isLast,
  onEditPeriod,
  onEditField,
  onMove,
  onRemove,
}: Props) => (
  <li className={styles.row}>
    <div className={styles.inputs}>
      <AdminInput
        size="sm"
        aria-label="경력 기간"
        name={`career.${index}.period`}
        autoComplete="off"
        value={entry.period}
        placeholder="2025 — 현재"
        onChange={(e) => onEditPeriod(index, e.target.value)}
      />
      {FIELDS.map(({ key, label }) => (
        <div key={key} className={styles.grid2}>
          <AdminInput
            size="sm"
            aria-label={`${label} (한국어)`}
            name={`career.${index}.${key}.ko`}
            autoComplete="off"
            value={entry[key].ko}
            placeholder={`${label} (한국어)`}
            onChange={(e) => onEditField(index, key, "ko", e.target.value)}
          />
          <AdminInput
            size="sm"
            aria-label={`${label} (English)`}
            name={`career.${index}.${key}.en`}
            autoComplete="off"
            value={entry[key].en}
            placeholder={`${label} (English)`}
            onChange={(e) => onEditField(index, key, "en", e.target.value)}
          />
        </div>
      ))}
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

export { DevTimelineRow };
