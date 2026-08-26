"use client";

import Link from "next/link";

import { Icon } from "@/components/Icon";

import { adminDevArticleRoute } from "@/constants/routes";
import { formatEventYMD, formatLocalYMD } from "@/lib/format/format-date";

import type { AdminDevArticleListItem } from "@/types/admin";

import styles from "./ArticleRow.module.css";

type Props = {
  article: AdminDevArticleListItem;
  pinBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onTogglePinned: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 관리자 글 목록의 한 행 — 제목·주소·태그 수·발행일·고정/공개 토글·수정/삭제.
 *
 * 드래그 핸들이 없다. 블로그는 발행일이 정렬의 기준이라 손으로 옮길 순서가 없다.
 * 발행일 칸에는 초안일 때 수정일을 대신 보여 준다 — 초안에는 발행일이 없고,
 * 목록에서 초안을 최근 작업 순으로 훑게 되기 때문이다.
 *
 * 고정은 편집 폼이 아니라 이 행에만 둔다. 글 내용이 아니라 목록에서의 배치 결정이고,
 * 두 곳에 두면 어느 값이 최신인지 알 수 없다.
 *
 * @param {Props} props
 * @param {AdminDevArticleListItem} props.article 본문을 뺀 목록 행.
 * @param {boolean} props.pinBusy 이 행의 고정 요청이 진행 중이다. 낙관적 갱신이라 연타하면
 *   화면과 서버 상태가 어긋난다.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished 공개 상태를 바꾼다.
 * @param {(id: string, next: boolean) => void} props.onTogglePinned 고정 상태를 바꾼다.
 * @param {(id: string) => void} props.onDelete 확인 후 글을 지운다.
 * @returns {JSX.Element}
 */
const ArticleRow = ({ article, pinBusy, onTogglePublished, onTogglePinned, onDelete }: Props) => {
  const title = article.title.ko || "제목 없음";
  const onDeleteClick = () => {
    if (window.confirm(`"${title}" 글을 삭제할까요?`)) {
      onDelete(article.id);
    }
  };

  return (
    <li className={styles.row}>
      <span className={styles.main}>
        <Link href={adminDevArticleRoute(article.id)} className={styles.title}>
          {title}
        </Link>
        <span className={styles.slug}>{article.slug || "주소 없음"}</span>
      </span>

      <span className={styles.tags}>
        {article.tags.length > 0 ? `태그 ${article.tags.length}` : "—"}
      </span>

      <span className={styles.date}>
        {article.publishedAt
          ? formatEventYMD(article.publishedAt)
          : `수정 ${formatLocalYMD(article.updatedAt)}`}
      </span>

      {/* 아이콘만 두고 색으로 상태를 나눈다. 이름은 고정하고 상태는 aria-pressed 가 전한다.
          이름까지 뒤집으면 보조기술이 "고정 해제, 눌림" 처럼 반대되는 두 신호를 함께 읽는다. */}
      <button
        type="button"
        className={`${styles.badge} ${styles.pinBadge} ${article.pinned ? styles.badgeOn : ""}`}
        aria-pressed={article.pinned}
        aria-label={`${title} 고정`}
        disabled={pinBusy}
        onClick={() => onTogglePinned(article.id, !article.pinned)}
      >
        <Icon name="pin" size={14} />
      </button>

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
