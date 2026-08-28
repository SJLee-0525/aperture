"use client";

import { useRef } from "react";

import styles from "./RangeSlider.module.css";

type Props = {
  min: number;
  max: number;
  low: number;
  high: number;
  unit?: string;
  /** 낮은 쪽 손잡이의 접근 이름. "min mm" 처럼 무엇의 최소인지 없는 이름을 막는다. */
  minLabel: string;
  /** 높은 쪽 손잡이의 접근 이름. */
  maxLabel: string;
  onChange: (low: number, high: number) => void;
  /** pointerup, keyup, blur에서 현재 범위를 전달한다. */
  onChangeEnd?: (low: number, high: number) => void;
  /** pointercancel에서 호출한다. 호출부는 취소 전 값으로 복원할 수 있다. */
  onChangeCancel?: () => void;
};

/**
 * 듀얼 핸들 레인지 슬라이더 (초점거리 min~max). 두 range input을 겹쳐 thumb만 조작 가능.
 * onChange는 드래그 틱마다, onChangeEnd는 조작이 끝났을 때 한 번 호출된다.
 *
 * @returns 두 개의 native range input으로 만든 범위 슬라이더.
 */
const RangeSlider = ({
  min,
  max,
  low,
  high,
  unit = "",
  minLabel,
  maxLabel,
  onChange,
  onChangeEnd,
  onChangeCancel,
}: Props) => {
  const span = max - min || 1;
  const leftPct = ((low - min) / span) * 100;
  const rightPct = 100 - ((high - min) / span) * 100;

  // 조작 상태: onChange가 있어야 커밋할 것이 생긴다(adjusting). 커밋·취소가 끝나면
  // idle로 돌아가므로 pointerup 뒤의 blur가 같은 값을 다시 커밋하거나, pointercancel
  // 뒤의 blur가 취소된 값을 되살리는 일이 구조적으로 없다.
  const adjustingRef = useRef(false);

  const changeOf = (side: "low" | "high") => (event: React.ChangeEvent<HTMLInputElement>) => {
    adjustingRef.current = true;
    const value = Number(event.target.value);
    if (side === "low") onChange(Math.min(value, high), high);
    else onChange(low, Math.max(value, low));
  };

  // 마지막 틱의 렌더가 종료 이벤트보다 늦을 수 있으므로 조작한 input에서 값을 직접 읽는다.
  const endHandlers = (side: "low" | "high") => {
    const end = (event: { currentTarget: HTMLInputElement }) => {
      if (!adjustingRef.current) return;
      adjustingRef.current = false;
      const value = Number(event.currentTarget.value);
      if (side === "low") onChangeEnd?.(Math.min(value, high), high);
      else onChangeEnd?.(low, Math.max(value, low));
    };
    return {
      onPointerUp: end,
      onKeyUp: end,
      onBlur: end,
      onPointerCancel: () => {
        if (!adjustingRef.current) return;
        adjustingRef.current = false;
        onChangeCancel?.();
      },
    };
  };

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
          onChange={changeOf("low")}
          className={styles.input}
          aria-label={minLabel}
          aria-valuetext={`${low}${unit}`}
          {...endHandlers("low")}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={high}
          onChange={changeOf("high")}
          className={styles.input}
          aria-label={maxLabel}
          aria-valuetext={`${high}${unit}`}
          {...endHandlers("high")}
        />
      </div>
    </div>
  );
};

export { RangeSlider };
