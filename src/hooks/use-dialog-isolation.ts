"use client";

import { useEffect } from "react";

/**
 * 포털 dialog가 열린 동안 나머지 body 콘텐츠를 접근성·포커스 트리에서 격리한다.
 *
 * @param {boolean} active
 * @param {string} overlaySelector
 * @returns {void}
 */
const useDialogIsolation = (active: boolean, overlaySelector: string) => {
  useEffect(() => {
    if (!active) return;
    const overlay = document.querySelector(overlaySelector);
    if (!overlay) return;

    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay,
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
  }, [active, overlaySelector]);
};

export { useDialogIsolation };
