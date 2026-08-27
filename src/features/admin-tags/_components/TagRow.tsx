"use client";

import { AdminInput } from "@/components/AdminInput";
import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import type { Tag } from "@/types/tag";

import styles from "./TagRow.module.css";

type Props = {
  tag: Tag;
  /** 이 태그를 참조하는 사진 수. 0이 아니면 삭제를 잠근다. */
  usedCount: number;
  onEditLabel: (id: string, field: "ko" | "en", value: string) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 태그 행 — 드래그 핸들·읽기전용 id·ko/en 입력·삭제.
 *
 * @param {Props} props
 * @param {Tag} props.tag
 * @param {number} props.usedCount 이 태그를 참조하는 사진 수. 0이 아니면 삭제를 잠근다.
 * @param {(id: string, field: 'ko' | 'en', value: string) => void} props.onEditLabel
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const TagRow = ({ tag, usedCount, onEditLabel, onDelete }: Props) => {
  return (
    <AdminSortableRow
      id={tag.id}
      dense
      onDelete={() => onDelete(tag.id)}
      confirmDelete={{ name: tag.id, noun: "태그" }}
      deleteDisabled={usedCount > 0}
      deleteTitle={usedCount > 0 ? "사용 중인 태그는 삭제할 수 없습니다." : undefined}
      beforeBadge={<span className={styles.usage}>{usedCount}장 사용</span>}
    >
      <code className={styles.id} title="사진이 참조하는 키 — 수정 불가">
        {tag.id}
      </code>

      <label className={styles.field}>
        <span className="sr-only">한국어</span>
        <AdminInput
          size="sm"
          value={tag.ko}
          placeholder="한국어"
          onChange={(e) => onEditLabel(tag.id, "ko", e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className="sr-only">English</span>
        <AdminInput
          size="sm"
          value={tag.en}
          placeholder="English"
          onChange={(e) => onEditLabel(tag.id, "en", e.target.value)}
        />
      </label>
    </AdminSortableRow>
  );
};

export { TagRow };
