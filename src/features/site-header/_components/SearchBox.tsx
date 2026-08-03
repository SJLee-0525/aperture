"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Icon } from "@/components/Icon";
import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./SearchBox.module.css";

/**
 * 데스크톱 헤더 검색 (모바일은 CSS로 숨김 — 모바일 검색은 버거 메뉴 안). 제출 시 통합 검색
 * 페이지(/search?q=)로 이동 — 사진·음악·개발 전 섹션을 검색한다. 우측 아이콘 버튼 클릭으로도 제출.
 */
const SearchBox = () => {
  const router = useRouter();
  const { dict } = useLang();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    router.push(query ? `${ROUTES.SEARCH}?q=${encodeURIComponent(query)}` : ROUTES.SEARCH);
  };

  return (
    <form className={styles.box} onSubmit={submit} role="search">
      <input
        type="text"
        name="q"
        autoComplete="off"
        placeholder={dict.searchPlaceholder}
        aria-label={dict.searchPlaceholder}
        className={styles.input}
      />
      <button type="submit" className={styles.btn} aria-label={dict.searchPlaceholder}>
        <Icon name="search" size={17} />
      </button>
    </form>
  );
};

export { SearchBox };
