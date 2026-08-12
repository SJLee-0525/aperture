"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 포인터가 벗어난 뒤 닫기까지 기다리는 시간(ms). 경계를 스치듯 지나갈 때 바로 닫히지 않게 한다. */
const CLOSE_GRACE_MS = 300;

type HoverGrace = {
  open: boolean;
  /** 포인터가 들어오거나 내부가 포커스를 받을 때. */
  onEnter: () => void;
  /** 포인터가 벗어나거나 포커스가 밖으로 나갈 때 — 유예 뒤에 닫는다. */
  onLeave: () => void;
  /** 즉시 닫는다(Escape 등). */
  close: () => void;
};

/**
 * 포인터로 여닫는 패널의 열림 상태 — 닫을 때만 유예를 둔다.
 *
 * 인디케이터와 패널 사이에 빈틈이 있으면 그 사이를 지나는 동안 닫혔다 열리기를 반복한다.
 * 유예 시간 안에 다시 들어오면 예약된 닫기를 취소해 그 깜빡임을 없앤다.
 *
 * @returns {HoverGrace} 열림 상태와 진입·이탈·즉시 닫기 핸들러.
 */
const useHoverGrace = (): HoverGrace => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => clearTimer, []);

  const onEnter = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, []);

  const onLeave = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, []);

  return { open, onEnter, onLeave, close };
};

export { CLOSE_GRACE_MS, useHoverGrace };
