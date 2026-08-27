"use client";

import { useEffect, useRef } from "react";

import { useOverlayLayer } from "@/hooks/use-overlay-layer";

/**
 * 열린 오버레이의 Escape 처리.
 *
 * 오버레이를 전역 stack 에 등록하고, 자신이 최상위일 때만 Escape 에 반응한다. 반응할 때는
 * 같은 이벤트의 나머지 리스너를 끊어 겹쳐 있는 오버레이 둘이 한 번에 닫히지 않게 한다.
 *
 * ## keydown 소유자
 *
 * 저장소에서 keydown 을 직접 듣는 곳은 여기 말고도 넷이 있고 타깃과 페이즈가 다르다.
 * `window` capture 는 `document` capture 보다, capture 는 bubble 보다 먼저 뛴다.
 *
 * | 위치 | 타깃 | 페이즈 | 이유 |
 * | --- | --- | --- | --- |
 * | 이 훅 | `document` | bubble | 오버레이 공통 |
 * | `ImageLightbox` | `document` | capture | Escape·방향키·확대 복귀가 한 리스너 |
 * | `PhotoModal` | `window` | capture | 위와 같고, 라이트박스보다 먼저 받아야 한다 |
 * | `use-photo-modal` | `window` | bubble | 이동 키. `keyboardEnabled` 로 게이트 |
 * | `use-focus-trap` | 컨테이너 | bubble | Tab 순환. 오버레이 밖 키를 보지 않는다 |
 *
 * `CustomCursor` 의 Escape 는 오버레이가 아니라 자동 스크롤 중단이라 stack 에 넣지 않는다.
 * 전역 stack 에 등록하면 열려 있는 모달의 Escape 를 가로챈다.
 *
 * @param active 오버레이가 열려 있는지.
 * @param onEscape Escape 를 소비했을 때 실행할 동작.
 * @returns 등록된 오버레이 중 자신이 최상위이면 `true`.
 */
const useEscapeKey = (active: boolean, onEscape: () => void): boolean => {
  const isTopLayer = useOverlayLayer(active);
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
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, isTopLayer]);

  return isTopLayer;
};

export { useEscapeKey };
