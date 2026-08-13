"use client";

import { Icon } from "@/components/Icon";

import type { SiteLink } from "@/types/site";

import styles from "./LinkRow.module.css";

type Props = {
  link: SiteLink;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (index: number, field: keyof SiteLink, value: string) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

/**
 * 연락처 링크 한 행 — label·href 입력 + 위/아래 이동 + 삭제.
 *
 * @param {Props} props
 * @param {SiteLink} props.link
 * @param {number} props.index
 * @param {boolean} props.isFirst
 * @param {boolean} props.isLast
 * @param {(index: number, field: keyof SiteLink, value: string) => void} props.onEdit
 * @param {(index: number, offset: -1 | 1) => void} props.onMove
 * @param {(index: number) => void} props.onRemove
 * @returns {JSX.Element}
 */
const LinkRow = ({ link, index, isFirst, isLast, onEdit, onMove, onRemove }: Props) => (
  <li className={styles.row}>
    <label className={styles.field}>
      <span className={styles.srLabel}>라벨</span>
      <input
        className={styles.input}
        value={link.label}
        placeholder="Instagram"
        onChange={(e) => onEdit(index, "label", e.target.value)}
      />
    </label>

    <label className={styles.field}>
      <span className={styles.srLabel}>주소</span>
      <input
        className={styles.input}
        value={link.href}
        placeholder="https://… 또는 mailto:…"
        onChange={(e) => onEdit(index, "href", e.target.value)}
      />
    </label>

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

export { LinkRow };
