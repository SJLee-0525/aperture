"use client";

import styles from "./RangeSlider.module.css";

type Props = {
  min: number;
  max: number;
  low: number;
  high: number;
  unit?: string;
  onChange: (low: number, high: number) => void;
};

/** 듀얼 핸들 레인지 슬라이더 (초점거리 min~max). 두 range input을 겹쳐 thumb만 조작 가능. */
const RangeSlider = ({ min, max, low, high, unit = "", onChange }: Props) => {
  const span = max - min || 1;
  const leftPct = ((low - min) / span) * 100;
  const rightPct = 100 - ((high - min) / span) * 100;

  return (
    <div>
      <div className={styles.vals}>
        <span>
          {low}
          {unit}
        </span>
        <span>–</span>
        <span>
          {high}
          {unit}
        </span>
      </div>
      <div className={styles.range}>
        <div className={styles.track}>
          <div className={styles.fill} style={{ left: `${leftPct}%`, right: `${rightPct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={low}
          onChange={(event) => onChange(Math.min(Number(event.target.value), high), high)}
          className={styles.input}
          aria-label={`min ${unit}`}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={high}
          onChange={(event) => onChange(low, Math.max(Number(event.target.value), low))}
          className={styles.input}
          aria-label={`max ${unit}`}
        />
      </div>
    </div>
  );
};

export { RangeSlider };
