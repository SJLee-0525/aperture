"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";

import styles from "./SearchBox.module.css";

/**
 * 데스크톱 헤더 검색 (모바일은 CSS로 숨김 — 모바일 검색은 Slice 2 갤러리 뷰에 배치).
 * 제출 시 작업(Work) 페이지로 `?q=` 를 붙여 이동 — Slice 2의 필터가 이 쿼리를 소비한다.
 */
const SearchBox = () => {
  const router = useRouter();
  const { dict } = useLang();
  const [value, setValue] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    router.push(query ? `${ROUTES.PHOTO}?q=${encodeURIComponent(query)}` : ROUTES.PHOTO);
  };

  return (
    <form className={styles.box} onSubmit={submit} role="search">
      <Icon name="search" size={15} />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={dict.searchPlaceholder}
        aria-label={dict.searchPlaceholder}
        className={styles.input}
      />
    </form>
  );
};

export { SearchBox };
