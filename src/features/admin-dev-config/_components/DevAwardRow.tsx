"use client";

import { Icon } from "@/components/Icon";

import type { DevAward } from "@/types/dev";

import styles from "./DevTimelineRow.module.css";

type Field = "name" | "place" | "description";
type Props = {
  award: DevAward;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEditYear: (index: number, value: string) => void;
  onEditProject: (index: number, value: string) => void;
  onEditField: (index: number, field: Field, lang: "ko" | "en", value: string) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

const FIELDS: { key: Field; label: string }[] = [
  { key: "name", label: "수상명" },
  { key: "place", label: "등위" },
  { key: "description", label: "설명" },
];

/**
 * 개발 수상 한 행 — 연도 + 수상명·등위·설명(ko/en) + 정렬/삭제.
 *
 * @param {Props} props
 * @param {DevAward} props.award
 * @param {number} props.index
 * @param {boolean} props.isFirst
 * @param {boolean} props.isLast
 * @param {(index: number, value: string) => void} props.onEditYear
 * @param {(index: number, value: string) => void} props.onEditProject
 * @param {(index: number, field: Field, lang: 'ko' | 'en', value: string) => void} props.onEditField
 * @param {(index: number, offset: -1 | 1) => void} props.onMove
 * @param {(index: number) => void} props.onRemove
 * @returns {JSX.Element}
 */
const DevAwardRow = ({
  award,
  index,
  isFirst,
  isLast,
  onEditYear,
  onEditProject,
  onEditField,
  onMove,
  onRemove,
}: Props) => (
  <li className={styles.row}>
    <div className={styles.inputs}>
      <input
        className={styles.input}
        aria-label="수상 연도"
        name={`awards.${index}.year`}
        autoComplete="off"
        value={award.year}
        placeholder="예: 2025…"
        onChange={(event) => onEditYear(index, event.target.value)}
      />
      <input
        className={styles.input}
        aria-label="연결할 프로젝트 ID"
        name={`awards.${index}.projectId`}
        autoComplete="off"
        spellCheck={false}
        translate="no"
        value={award.projectId}
        placeholder="예: recipedia…"
        onChange={(event) => onEditProject(index, event.target.value)}
      />
      {FIELDS.map(({ key, label }) => (
        <div key={key} className={styles.grid2}>
          <input
            className={styles.input}
            aria-label={`${label} (한국어)`}
            name={`awards.${index}.${key}.ko`}
            autoComplete="off"
            value={award[key].ko}
            placeholder={`${label} (한국어)…`}
            onChange={(event) => onEditField(index, key, "ko", event.target.value)}
          />
          <input
            className={styles.input}
            aria-label={`${label} (English)`}
            name={`awards.${index}.${key}.en`}
            autoComplete="off"
            value={award[key].en}
            placeholder={`${label} (English)…`}
            onChange={(event) => onEditField(index, key, "en", event.target.value)}
          />
        </div>
      ))}
    </div>
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.move}
        aria-label="위로"
        disabled={isFirst}
        onClick={() => onMove(index, -1)}
      >
        <Icon name="arrowUp" size={14} />
      </button>
      <button
        type="button"
        className={styles.move}
        aria-label="아래로"
        disabled={isLast}
        onClick={() => onMove(index, 1)}
      >
        <Icon name="arrowDown" size={14} />
      </button>
      <button type="button" className={styles.delete} onClick={() => onRemove(index)}>
        삭제
      </button>
    </div>
  </li>
);

export { DevAwardRow };
