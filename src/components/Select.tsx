"use client";

import { useId, useRef } from "react";

import { usePopupDisclosure } from "@/hooks/use-popup-disclosure";
import { useRovingListFocus } from "@/hooks/use-roving-list-focus";

import styles from "./Select.module.css";

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel?: string;
};

const chevron = (
  <svg
    className={styles.chevron}
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * 커스텀 드롭다운 — 네이티브 <select> 대신 토큰 스타일 트리거 + 리스트박스.
 * 바깥 클릭·Escape 로 닫힘. 순수 UI(비즈니스 로직 없음, props 만).
 *
 * @param {Props} props
 * @param {string} props.value
 * @param {Option[]} props.options
 * @param {(value: string) => void} props.onChange
 * @param {string | undefined} props.ariaLabel
 * @returns {JSX.Element}
 */
const Select = ({ value, options, onChange, ariaLabel }: Props) => {
  const { open, triggerRef, rootRef, toggle, close } = usePopupDisclosure<
    HTMLButtonElement,
    HTMLDivElement
  >();
  const listRef = useRef<HTMLUListElement>(null);
  // 한 지면에 Select 가 둘 이상이면 고정 id 는 트리거의 aria-controls 가 남의 목록을
  // 가리키게 만든다.
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];
  const currentIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const onListKeyDown = useRovingListFocus(open, listRef, { activeIndex: currentIndex });

  const pick = (next: string) => {
    onChange(next);
    close();
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={toggle}
      >
        <span className={styles.value}>{current?.label}</span>
        {chevron}
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          className={styles.list}
          role="listbox"
          aria-label={ariaLabel}
          data-accent-scrollbar
          data-custom-scroll-container
          data-custom-scroll-scope="local"
          onKeyDown={onListKeyDown}
        >
          {/* listbox 가 소유하는 것은 option 뿐이다. 중간에 li 를 두면 그 관계가 끊어진다. */}
          {options.map((option) => (
            <button
              key={option.value}
              data-list-item
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? styles.optActive : styles.opt}
              onClick={() => pick(option.value)}
            >
              {option.label}
            </button>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export { Select };
