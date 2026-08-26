"use client";

import { useEffect, useRef } from "react";

import { useOverlayLayer } from "@/hooks/use-overlay-layer";

type Options = {
  /** capture 단계에서 받는다. 같은 키를 아래 오버레이보다 먼저 소비해야 할 때만 쓴다. */
  capture?: boolean;
};

/**
 * 열린 오버레이의 Escape 처리.
 *
 * 오버레이를 전역 stack 에 등록하고, 자신이 최상위일 때만 Escape 에 반응한다. 반응할 때는
 * 같은 이벤트의 나머지 리스너를 끊어 겹쳐 있는 오버레이 둘이 한 번에 닫히지 않게 한다.
 *
 * 방향키까지 한 리스너에서 다루는 곳(`ImageLightbox`, `use-photo-modal`)과 오버레이가 아닌
 * 전역 동작(`CustomCursor` 의 자동 스크롤 중단)에는 쓰지 않는다. 키 사이의 순서와 조건이
 * 달라 나누면 동작이 바뀐다.
 *
 * @param active 오버레이가 열려 있는지.
 * @param onEscape Escape 를 소비했을 때 실행할 동작.
 * @returns 등록된 오버레이 중 자신이 최상위이면 `true`. 다른 키 처리도 이 값으로 게이트한다.
 */
const useEscapeKey = (active: boolean, onEscape: () => void, options?: Options): boolean => {
  const isTopLayer = useOverlayLayer(active);
  const capture = options?.capture ?? false;
  const handlerRef = useRef(onEscape);

  useEffect(() => {
    handlerRef.current = onEscape;
  });

  useEffect(() => {
    if (!active || !isTopLayer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      handlerRef.current();
    };
    document.addEventListener("keydown", onKeyDown, capture);
    return () => document.removeEventListener("keydown", onKeyDown, capture);
  }, [active, isTopLayer, capture]);

  return isTopLayer;
};

export { useEscapeKey };
