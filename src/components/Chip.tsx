import styles from "./Chip.module.css";

type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
};

/** 태그/필터 칩 (pill — 각진 디자인에서 유일한 둥근 요소) */
const Chip = ({ label, active, onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    className={`${styles.chip} ${active ? styles.active : ""}`}
  >
    {label}
  </button>
);

export { Chip };
