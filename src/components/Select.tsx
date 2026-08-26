"use client";

import { useEffect, useRef, useState } from "react";

import { useEscapeKey } from "@/hooks/use-escape-key";

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEscapeKey(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.value}>{current?.label}</span>
        {chevron}
      </button>

      {open ? (
        <ul
          id="filter-select-scroll-container"
          className={styles.list}
          role="listbox"
          data-accent-scrollbar
          data-custom-scroll-container
          data-custom-scroll-scope="local"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? styles.optActive : styles.opt}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export { Select };
