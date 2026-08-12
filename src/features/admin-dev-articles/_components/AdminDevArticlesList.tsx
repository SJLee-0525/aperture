"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { ArticleRow } from "@/features/admin-dev-articles/_components/ArticleRow";
import type { AdminArticleStatusFilter } from "@/features/admin-dev-articles/_lib/dev-article-filter";
import { useDevArticlesAdmin } from "@/features/admin-dev-articles/_hooks/use-dev-articles-admin";

import styles from "./AdminDevArticlesList.module.css";

const STATUS_FILTERS: { value: AdminArticleStatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "published", label: "공개" },
];

const NEW_ARTICLE_HREF = `${ROUTES.ADMIN_DEV_ARTICLES}/new`;

/**
 * 관리자 블로그 목록 — 검색·상태 필터·공개 토글·삭제. 조립만 하고 상태는 훅이 갖는다.
 *
 * 초안이 목록 위에 오고 발행 글이 발행일 내림차순으로 뒤따른다(`dev-article-sort`).
 *
 * @returns {JSX.Element}
 */
const AdminDevArticlesPage = () => {
  const {
    articles,
    total,
    status,
    error,
    keyword,
    setKeyword,
    statusFilter,
    setStatusFilter,
    togglePublished,
    remove,
  } = useDevArticlesAdmin();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>블로그</h1>
          <p className={styles.hint}>초안이 위에 오고 공개 글은 발행일 내림차순입니다.</p>
        </div>
        <Link href={NEW_ARTICLE_HREF} className={styles.newBtn}>
          + 새 글
        </Link>
      </header>

      {status === "ready" ? (
        <div className={styles.toolbar}>
          <input
            type="search"
            className={styles.searchInput}
            aria-label="검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목 또는 주소"
          />

          <div className={styles.filters} role="group" aria-label="상태 필터">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={styles.filter}
                aria-pressed={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "글을 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" && error ? (
        <p className={styles.stateError} role="alert">
          {error}
        </p>
      ) : null}

      {status === "ready" && total === 0 ? (
        <div className={styles.empty}>
          <p>아직 쓴 글이 없습니다.</p>
          <Link href={NEW_ARTICLE_HREF} className={styles.newBtn}>
            + 첫 글 쓰기
          </Link>
        </div>
      ) : null}

      {status === "ready" && total > 0 && articles.length === 0 ? (
        <p className={styles.state}>조건에 맞는 글이 없습니다.</p>
      ) : null}

      {articles.length > 0 ? (
        <ul className={styles.list}>
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              onTogglePublished={togglePublished}
              onDelete={remove}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default AdminDevArticlesPage;
