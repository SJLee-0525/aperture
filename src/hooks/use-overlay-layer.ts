"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";

const layers: symbol[] = [];
const listeners = new Set<() => void>();

const emitChange = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * 오버레이를 전역 stack에 등록하고 현재 최상위 오버레이인지 반환한다.
 * Escape와 방향키처럼 전역 입력을 처리하는 오버레이는 반환값이 `true`일 때만 반응해야 한다.
 *
 * @param active 오버레이가 열려 있는지 여부.
 * @returns 등록된 오버레이 중 자신이 최상위이면 `true`.
 */
const useOverlayLayer = (active: boolean): boolean => {
  const [token] = useState(() => Symbol("overlay-layer"));

  useLayoutEffect(() => {
    if (!active) return;
    layers.push(token);
    emitChange();
    return () => {
      const index = layers.lastIndexOf(token);
      if (index >= 0) layers.splice(index, 1);
      emitChange();
    };
  }, [active, token]);

  return useSyncExternalStore(
    subscribe,
    () => active && layers.at(-1) === token,
    () => false,
  );
};

export { useOverlayLayer };
