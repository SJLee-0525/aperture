"use client";

import { Fragment } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";

import type { SearchSuggestion } from "@/lib/search/suggest-documents";

import styles from "./SearchSuggestions.module.css";

type Props = {
  id: string;
  suggestions: SearchSuggestion[];
  activeIndex: number;
  onPick: (suggestion: SearchSuggestion) => void;
};

/**
 * aria-activedescendant 가 참조할 옵션 id — 검색창(콤보박스)과 리스트박스가 공유.
 *
 * @param {string} listboxId
 * @param {number} index
 * @returns {string}
 */
const optionId = (listboxId: string, index: number) => `${listboxId}-option-${index}`;

/**
 * 검색창 자동완성 드롭다운 — 결과 페이지와 같은 랭킹의 상위 매치를 리스트박스로 제안.
 * 선택 시 해당 콘텐츠 딥링크로 바로 이동한다(결과 페이지 경유 없음).
 * 옵션 pointerdown 의 기본 동작(포커스 이동)을 막아 input blur 로 리스트가 닫히기 전에
 * 클릭이 처리되게 한다. 키보드 활성(activeIndex)은 콤보박스 쪽 상태 — 여기는 표시만.
 *
 * @param {Props} props
 * @param {string} props.id
 * @param {SearchSuggestion[]} props.suggestions
 * @param {number} props.activeIndex
 * @param {(suggestion: SearchSuggestion) => void} props.onPick
 * @returns {JSX.Element}
 */
const SearchSuggestions = ({ id, suggestions, activeIndex, onPick }: Props) => {
  const { dict } = useLang();
  const sectionLabels = {
    photo: dict.sectionPhoto,
    music: dict.sectionMusic,
    dev: dict.sectionDev,
  } as const;

  return (
    <ul id={id} className={styles.list} role="listbox" aria-label={dict.searchSuggestionsLabel}>
      {suggestions.map((suggestion, index) => (
        <li key={suggestion.key}>
          <button
            type="button"
            role="option"
            id={optionId(id, index)}
            aria-selected={index === activeIndex}
            data-section={suggestion.section}
            className={index === activeIndex ? styles.rowActive : styles.row}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPick(suggestion)}
          >
            <span className={styles.title}>
              {suggestion.titleSegments.map((segment, segmentIndex) =>
                segment.hit ? (
                  <mark key={segmentIndex} className={styles.mark}>
                    {segment.text}
                  </mark>
                ) : (
                  <Fragment key={segmentIndex}>{segment.text}</Fragment>
                ),
              )}
            </span>
            <span className={`u-label ${styles.section}`}>{sectionLabels[suggestion.section]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export { SearchSuggestions, optionId };
