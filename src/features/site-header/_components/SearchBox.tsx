"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Icon } from "@/components/Icon";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useSearchSuggestions } from "@/features/site-header/_hooks/use-search-suggestions";

import { ROUTES } from "@/constants/routes";
import { localizePath } from "@/lib/i18n/locale-path";

import type { SearchSuggestion } from "@/lib/search/suggest-documents";
import type { FormEvent, KeyboardEvent } from "react";

import styles from "./SearchBox.module.css";
import { SearchSuggestions, optionId } from "./SearchSuggestions";

/**
 * 데스크톱 헤더 검색 (모바일은 CSS로 숨김 — 모바일 검색은 버거 메뉴 안). 제출 시 통합 검색
 * 페이지(/search?q=)로 이동. 입력 중에는 검색 인덱스(포커스 시 lazy load) 상위 매치를
 * 자동완성으로 제안 — 방향키로 고르고 Enter/클릭 시 해당 콘텐츠 딥링크로 바로 이동.
 *
 * @returns {JSX.Element}
 */
const SearchBox = () => {
  const router = useRouter();
  const { dict, lang } = useLang();
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { suggestions, loadIndex } = useSearchSuggestions(query);

  const showList = open && suggestions.length > 0;
  const active = showList && activeIndex < suggestions.length ? activeIndex : -1;

  const pick = (suggestion: SearchSuggestion) => {
    setOpen(false);
    router.push(localizePath(lang, suggestion.href));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    setOpen(false);
    router.push(
      localizePath(
        lang,
        trimmed ? `${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}` : ROUTES.SEARCH,
      ),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      pick(suggestions[active]!);
    }
  };

  return (
    <form className={styles.box} onSubmit={submit} role="search">
      <input
        type="text"
        name="q"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        // 닫힌 동안에는 그 id 를 가진 요소가 없다. ARIA 1.2 는 팝업이 없을 때 생략을 허용한다.
        aria-controls={showList ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? optionId(listboxId, active) : undefined}
        placeholder={dict.searchPlaceholder}
        aria-label={dict.searchPlaceholder}
        className={styles.input}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onFocus={() => {
          loadIndex();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <button type="submit" className={styles.btn} aria-label={dict.searchPlaceholder}>
        <Icon name="search" size={17} />
      </button>

      {showList ? (
        <SearchSuggestions
          id={listboxId}
          suggestions={suggestions}
          activeIndex={active}
          onPick={pick}
        />
      ) : null}
    </form>
  );
};

export { SearchBox };
