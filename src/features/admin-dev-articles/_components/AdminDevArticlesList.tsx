"use client";

import { AdminInput } from "@/components/AdminInput";
import { ArticleRow } from "@/features/admin-dev-articles/_components/ArticleRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";

import { useDevArticlesAdmin } from "@/features/admin-dev-articles/_hooks/use-dev-articles-admin";

import { adminNewRoute, ROUTES } from "@/constants/routes";

import type { AdminArticleStatusFilter } from "@/features/admin-dev-articles/_lib/dev-article-filter";

import styles from "./AdminDevArticlesList.module.css";

const STATUS_FILTERS: { value: AdminArticleStatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "published", label: "공개" },
];

/**
 * 관리자 블로그 목록 — 검색·상태 필터·공개 토글·삭제. 조립만 하고 상태는 훅이 갖는다.
 *
 * 정렬이 없어 목록 셸만 쓴다. 초안이 목록 위에 오고 발행 글이 발행일 내림차순으로
 * 뒤따른다(`dev-article-sort`).
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
    togglePinned,
    pendingPinIds,
    pendingPublishIds,
    remove,
  } = useDevArticlesAdmin();

  return (
    <AdminListShell
      title="블로그"
      hint="초안은 먼저 표시하고, 공개 글은 최근 발행순으로 정렬합니다."
      newHref={adminNewRoute(ROUTES.ADMIN_DEV_ARTICLES)}
      newLabel="+ 새 글"
      emptyLabel="아직 쓴 글이 없습니다."
      emptyCtaLabel="+ 첫 글 쓰기"
      status={status}
      error={error}
      errorFallback="글을 불러오지 못했습니다."
      isEmpty={total === 0}
      notice={error}
      filteredEmptyLabel="조건에 맞는 글이 없습니다."
      isFilteredEmpty={articles.length === 0}
      toolbar={
        status === "ready" ? (
          <div className={styles.toolbar}>
            <AdminInput
              type="search"
              size="sm"
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
        ) : null
      }
    >
      <ul className={styles.list}>
        {articles.map((article) => (
          <ArticleRow
            key={article.id}
            article={article}
            pinBusy={pendingPinIds.has(article.id)}
            publishBusy={pendingPublishIds.has(article.id)}
            onTogglePublished={togglePublished}
            onTogglePinned={togglePinned}
            onDelete={remove}
          />
        ))}
      </ul>
    </AdminListShell>
  );
};

export default AdminDevArticlesPage;
