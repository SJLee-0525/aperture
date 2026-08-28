"use client";

import { useEffect, useRef } from "react";

/**
 * 활성 상태에서 `container` 바깥을 눌렀을 때 알린다.
 *
 * click 이 아니라 pointerdown 을 듣는다. 패널 안의 버튼을 누른 채 밖에서 손을 떼면 click 이
 * 나지 않아 패널이 열린 채 남는다.
 *
 * @param active 감시할지 여부.
 * @param container 안쪽으로 볼 범위.
 * @param onOutside 바깥을 눌렀을 때 실행할 동작.
 */
const useOutsidePointerDown = (
  active: boolean,
  container: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
) => {
  const handlerRef = useRef(onOutside);

  useEffect(() => {
    handlerRef.current = onOutside;
  });

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      if (container.current?.contains(event.target as Node)) return;
      handlerRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active, container]);
};

export { useOutsidePointerDown };
