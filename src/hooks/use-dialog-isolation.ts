"use client";

import { useEffect } from "react";

import type { RefObject } from "react";

/**
 * 포털 dialog가 열린 동안 나머지 body 콘텐츠를 접근성·포커스 트리에서 격리한다.
 *
 * 오버레이를 선택자가 아니라 ref 로 받는다. 선택자는 같은 마크업이 두 번 마운트되거나
 * 포털 대상이 바뀌면 다른 노드를 첫 매치로 집어, dialog 가 자기 자신을 inert 로 만든다.
 *
 * @param overlayRef 격리에서 제외할 오버레이 노드.
 */
const useDialogIsolation = (active: boolean, overlayRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!active) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    // inert 는 body 직속 자식 단위로만 걸 수 있다. 오버레이가 더 깊이 있으면
    // 그것을 품은 조상을 찾아 제외해야 오버레이까지 함께 잠기지 않는다.
    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && !element.contains(overlay),
    );
    const previous = siblings.map((element) => ({
      element,
      inert: element.inert,
    }));

    siblings.forEach((element) => {
      element.inert = true;
    });

    return () => {
      previous.forEach(({ element, inert }) => {
        element.inert = inert;
      });
    };
  }, [active, overlayRef]);
};

export { useDialogIsolation };
