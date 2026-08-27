"use client";

import { AdminButton } from "@/components/AdminButton";

import type { ReactNode } from "react";

import styles from "./admin-list.module.css";

type Props = {
  title: string;
  hint?: ReactNode;
  /** 목록 상단과 빈 상태 CTA 가 함께 쓰는 신규 작성 경로. */
  newHref: string;
  newLabel: string;
  emptyLabel: string;
  emptyCtaLabel: string;
  status: "loading" | "ready" | "error";
  error?: string | null;
  errorFallback: string;
  isEmpty: boolean;
  /** toolbar 는 제목 줄과 목록 사이에 들어간다. 검색·필터가 있는 화면만 넘긴다. */
  toolbar?: ReactNode;
  /**
   * 목록을 감추지 않는 안내. 목록을 불러온 뒤의 저장 실패처럼 화면을 비울 이유가
   * 없는 오류에 쓴다. `status === "error"` 는 목록 자체를 못 읽은 경우다.
   */
  notice?: string | null;
  /** 필터가 걸러 목록이 빈 경우의 문구. 전체가 비었을 때(`emptyLabel`)와 이유가 다르다. */
  filteredEmptyLabel?: string;
  isFilteredEmpty?: boolean;
  children?: ReactNode;
};

/**
 * 관리자 목록 화면의 공통 골격.
 *
 * 제목·안내·신규 버튼·상태 4분기·빈 상태를 소유한다. 정렬이 있는 목록은 이 안에
 * `AdminSortableList` 를 넣고, 블로그 글처럼 정렬이 없는 목록은 `children` 에 `<ul>` 을
 * 직접 넣는다.
 */
const AdminListShell = ({
  title,
  hint,
  newHref,
  newLabel,
  emptyLabel,
  emptyCtaLabel,
  status,
  error,
  errorFallback,
  isEmpty,
  toolbar,
  notice,
  filteredEmptyLabel,
  isFilteredEmpty = false,
  children,
}: Props) => (
  <div className={styles.page}>
    <header className={styles.head}>
      <div className={styles.headText}>
        <h1 className={styles.title}>{title}</h1>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
      </div>
      <AdminButton variant="primary" size="sm" href={newHref} className={styles.newBtn}>
        {newLabel}
      </AdminButton>
    </header>

    {toolbar}

    {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

    {status === "error" ? (
      <p className={styles.stateError} role="alert">
        {error ?? errorFallback}
      </p>
    ) : null}

    {status === "ready" && isEmpty ? (
      <div className={styles.empty}>
        <p>{emptyLabel}</p>
        <AdminButton variant="primary" size="sm" href={newHref} className={styles.newBtn}>
          {emptyCtaLabel}
        </AdminButton>
      </div>
    ) : null}

    {status === "ready" && !isEmpty ? (
      <>
        {notice ? (
          <p className={styles.stateError} role="alert">
            {notice}
          </p>
        ) : null}
        {isFilteredEmpty ? <p className={styles.state}>{filteredEmptyLabel}</p> : children}
      </>
    ) : null}
  </div>
);

export { AdminListShell };
