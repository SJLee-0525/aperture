"use client";

import Link from "next/link";

import { adminDevArticleRoute } from "@/constants/routes";
import { formatYMD } from "@/lib/format/format-date";

import type { AdminDevArticleListItem } from "@/types/admin";

import styles from "./ArticleRow.module.css";

type Props = {
  article: AdminDevArticleListItem;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 관리자 글 목록의 한 행 — 제목·주소·태그 수·발행일·공개 토글·수정/삭제.
 *
 * 드래그 핸들이 없다. 블로그는 발행일이 정렬의 기준이라 손으로 옮길 순서가 없다.
 * 발행일 칸에는 초안일 때 수정일을 대신 보여 준다 — 초안에는 발행일이 없고,
 * 목록에서 초안을 최근 작업 순으로 훑게 되기 때문이다.
 *
 * @param {Props} props
 * @param {AdminDevArticleListItem} props.article 본문을 뺀 목록 행.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished 공개 상태를 바꾼다.
 * @param {(id: string) => void} props.onDelete 확인 후 글을 지운다.
 * @returns {JSX.Element}
 */
const ArticleRow = ({ article, onTogglePublished, onDelete }: Props) => {
  const onDeleteClick = () => {
    if (window.confirm(`"${article.title.ko || "제목 없음"}" 글을 삭제할까요?`)) {
      onDelete(article.id);
    }
  };

  return (
    <li className={styles.row}>
      <span className={styles.main}>
        <Link href={adminDevArticleRoute(article.id)} className={styles.title}>
          {article.title.ko || "제목 없음"}
        </Link>
        <span className={styles.slug}>{article.slug || "주소 없음"}</span>
      </span>

      <span className={styles.tags}>
        {article.tags.length > 0 ? `태그 ${article.tags.length}` : "—"}
      </span>

      <span className={styles.date}>
        {article.publishedAt
          ? formatYMD(article.publishedAt)
          : `수정 ${formatYMD(article.updatedAt)}`}
      </span>

      <button
        type="button"
        className={`${styles.badge} ${article.published ? styles.badgeOn : ""}`}
        onClick={() => onTogglePublished(article.id, !article.published)}
      >
        {article.published ? "공개" : "초안"}
      </button>

      <span className={styles.actions}>
        <Link href={adminDevArticleRoute(article.id)} className={styles.edit}>
          수정
        </Link>
        <button type="button" className={styles.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { ArticleRow };
