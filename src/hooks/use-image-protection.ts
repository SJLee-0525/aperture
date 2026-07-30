"use client";

import { useEffect } from "react";

const PROTECTED_IMAGE_SELECTOR = "[data-protected-image]";

/**
 * 공개 이미지 영역의 브라우저 기본 이미지 동작을 한 번의 document 캡처 리스너로 차단한다.
 * 각 이미지 컴포넌트를 client boundary로 바꾸지 않도록 영역 표시는 data 속성으로 분리한다.
 */
const useImageProtection = () => {
  useEffect(() => {
    const preventProtectedImageAction = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(PROTECTED_IMAGE_SELECTOR)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventProtectedImageAction, true);
    document.addEventListener("dragstart", preventProtectedImageAction, true);
    document.addEventListener("selectstart", preventProtectedImageAction, true);
    return () => {
      document.removeEventListener("contextmenu", preventProtectedImageAction, true);
      document.removeEventListener("dragstart", preventProtectedImageAction, true);
      document.removeEventListener("selectstart", preventProtectedImageAction, true);
    };
  }, []);
};

export { useImageProtection };
