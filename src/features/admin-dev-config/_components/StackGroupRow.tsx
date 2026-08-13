"use client";

import { Icon } from "@/components/Icon";

import type { DevStackGroup, DevStackItem } from "@/types/dev";

import styles from "./StackGroupRow.module.css";

type Props = {
  group: DevStackGroup;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEditCategory: (index: number, value: string) => void;
  onAddItem: (index: number) => void;
  onEditItem: (index: number, itemIndex: number, field: keyof DevStackItem, value: string) => void;
  onRemoveItem: (index: number, itemIndex: number) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

/**
 * 유효한 hex 색이면 그대로, 아니면 미리보기용 기본색. color input 은 hex 만 받으므로 보정.
 *
 * @param {string} value
 * @returns {string}
 */
const toColorValue = (value: string): string =>
  /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";

/**
 * 기술 스택 그룹 한 항목 — 카테고리 + 항목들(이름·배경색·글자색).
 * 색은 관리자가 지정하는 데이터라 <input type="color"> 값·인라인 style 로 다룬다.
 *
 * @param {Props} props
 * @param {DevStackGroup} props.group
 * @param {number} props.index
 * @param {boolean} props.isFirst
 * @param {boolean} props.isLast
 * @param {(index: number, value: string) => void} props.onEditCategory
 * @param {(index: number) => void} props.onAddItem
 * @param {(index: number, itemIndex: number, field: keyof DevStackItem, value: string) => void} props.onEditItem
 * @param {(index: number, itemIndex: number) => void} props.onRemoveItem
 * @param {(index: number, offset: -1 | 1) => void} props.onMove
 * @param {(index: number) => void} props.onRemove
 * @returns {JSX.Element}
 */
const StackGroupRow = ({
  group,
  index,
  isFirst,
  isLast,
  onEditCategory,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onMove,
  onRemove,
}: Props) => (
  <li className={styles.group}>
    <div className={styles.groupHead}>
      <input
        className={styles.categoryInput}
        value={group.category}
        placeholder="카테고리 (예: Frontend)"
        onChange={(e) => onEditCategory(index, e.target.value)}
      />
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
          그룹 삭제
        </button>
      </div>
    </div>

    {group.items.length === 0 ? (
      <p className={styles.note}>아직 기술이 없습니다.</p>
    ) : (
      <ul className={styles.items}>
        {group.items.map((item, itemIndex) => (
          <li key={itemIndex} className={styles.item}>
            <span
              className={styles.chipPreview}
              style={{
                background: /^#[0-9a-fA-F]{6}$/.test(item.bg) ? item.bg : undefined,
                color: /^#[0-9a-fA-F]{6}$/.test(item.fg) ? item.fg : undefined,
              }}
            >
              {item.name || "기술"}
            </span>
            <input
              className={styles.nameInput}
              value={item.name}
              placeholder="기술명 (예: React)"
              onChange={(e) => onEditItem(index, itemIndex, "name", e.target.value)}
            />
            <label className={styles.colorField}>
              <span className={styles.colorLabel}>배경</span>
              <input
                type="color"
                className={styles.color}
                value={toColorValue(item.bg)}
                onChange={(e) => onEditItem(index, itemIndex, "bg", e.target.value)}
              />
            </label>
            <label className={styles.colorField}>
              <span className={styles.colorLabel}>글자</span>
              <input
                type="color"
                className={styles.color}
                value={toColorValue(item.fg)}
                onChange={(e) => onEditItem(index, itemIndex, "fg", e.target.value)}
              />
            </label>
            <button
              type="button"
              className={styles.itemDelete}
              onClick={() => onRemoveItem(index, itemIndex)}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    )}

    <button type="button" className={styles.addItem} onClick={() => onAddItem(index)}>
      + 기술 추가
    </button>
  </li>
);

export { StackGroupRow };
