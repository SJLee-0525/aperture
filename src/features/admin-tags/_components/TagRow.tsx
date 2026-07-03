"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Tag } from "@/types/tag";

import styles from "./TagRow.module.css";

type Props = {
  tag: Tag;
  onEditLabel: (id: string, field: "ko" | "en", value: string) => void;
  onDelete: (id: string) => void;
};

/** 정렬 가능한 태그 행 — 드래그 핸들·읽기전용 id·ko/en 입력·삭제. */
const TagRow = ({ tag, onEditLabel, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (
      window.confirm(
        `"${tag.id}" 태그를 삭제할까요?\n\n` +
          `이미 이 태그를 쓰는 사진의 tags 배열엔 이 id 가 남을 수 있습니다.`,
      )
    ) {
      onDelete(tag.id);
    }
  };

  return (
    <li ref={setNodeRef} style={style} className={styles.row}>
      <button
        type="button"
        className={styles.handle}
        aria-label="순서 이동"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <code className={styles.id} title="사진이 참조하는 키 — 수정 불가">
        {tag.id}
      </code>

      <label className={styles.field}>
        <span className={styles.srLabel}>한국어</span>
        <input
          className={styles.input}
          value={tag.ko}
          placeholder="한국어"
          onChange={(e) => onEditLabel(tag.id, "ko", e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.srLabel}>English</span>
        <input
          className={styles.input}
          value={tag.en}
          placeholder="English"
          onChange={(e) => onEditLabel(tag.id, "en", e.target.value)}
        />
      </label>

      <button type="button" className={styles.delete} onClick={onDeleteClick}>
        삭제
      </button>
    </li>
  );
};

export { TagRow };
