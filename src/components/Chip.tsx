"use client";

import styles from "./Chip.module.css";

type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
};

/**
 * 태그/필터 칩 (pill — 각진 디자인에서 유일한 둥근 요소)
 *
 * 선택 상태는 배경색과 `aria-pressed` 두 가지로 알린다. 색만으로는 화면 낭독기가 어떤 칩이
 * 켜져 있는지 알 수 없다. 스타일은 `active` 클래스에 걸려 있어 속성은 이름만 전달한다.
 *
 * @param {Props} props
 * @param {string} props.label
 * @param {boolean} props.active
 * @param {() => void} props.onClick
 * @returns {JSX.Element}
 */
const Chip = ({ label, active, onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`${styles.chip} ${active ? styles.active : ""}`}
    data-cursor-shape="pill"
  >
    {label}
  </button>
);

export { Chip };
