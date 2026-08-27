"use client";

import Link from "next/link";

import type { CSSProperties, ReactNode, Ref } from "react";

import styles from "./admin-row.module.css";

type Props = {
  /** 가운데 컬럼. 썸네일·제목·도메인 값은 각 feature 가 넣는다. */
  children: ReactNode;
  /** 드래그 핸들. 정렬이 없는 목록(블로그 글)은 넘기지 않는다. */
  handle?: ReactNode;
  /** 없으면 공개 배지를 그리지 않는다. 태그 사전처럼 published 가 없는 행이 그렇다. */
  published?: boolean;
  onTogglePublished?: (next: boolean) => void;
  publishedBusy?: boolean;
  publishedLabels?: { on: string; off: string };
  /** 공개 배지 앞에 들어갈 추가 조작. 블로그의 고정 토글이 여기에 온다. */
  beforeBadge?: ReactNode;
  /** 없으면 수정 링크를 그리지 않는다. */
  editHref?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
  /** 인라인 입력이 들어가 간격을 좁히는 행. 태그 사전이 쓴다. */
  dense?: boolean;
  innerRef?: Ref<HTMLLIElement>;
  style?: CSSProperties;
};

/**
 * 관리자 목록 행의 공통 껍데기.
 *
 * 핸들과 공개 배지는 선택 사항이다. 태그 사전 행에는 배지가 없고 글 행에는 핸들이 없어,
 * 둘을 필수로 두면 없던 요소가 딸려 온다. 정렬이 있는 목록은 `AdminSortableRow` 를 쓴다.
 */
const AdminRow = ({
  children,
  handle,
  published,
  onTogglePublished,
  publishedBusy = false,
  publishedLabels = { on: "공개", off: "비공개" },
  beforeBadge,
  editHref,
  onDelete,
  deleteDisabled = false,
  deleteTitle,
  dense = false,
  innerRef,
  style,
}: Props) => (
  <li
    ref={innerRef}
    style={style}
    className={dense ? `${styles.row} ${styles.rowDense}` : styles.row}
  >
    {handle}
    {children}
    {beforeBadge}

    {published !== undefined && onTogglePublished ? (
      <button
        type="button"
        className={`${styles.badge} ${published ? styles.badgeOn : ""}`}
        disabled={publishedBusy}
        onClick={() => onTogglePublished(!published)}
      >
        {published ? publishedLabels.on : publishedLabels.off}
      </button>
    ) : null}

    {editHref || onDelete ? (
      <span className={styles.actions}>
        {editHref ? (
          <Link href={editHref} className={styles.edit}>
            수정
          </Link>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            className={styles.delete}
            onClick={onDelete}
            disabled={deleteDisabled}
            title={deleteTitle}
          >
            삭제
          </button>
        ) : null}
      </span>
    ) : null}
  </li>
);

export { AdminRow };
