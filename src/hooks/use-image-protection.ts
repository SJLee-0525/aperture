"use client";

import { useEffect } from "react";

const PROTECTED_IMAGE_SELECTOR = "[data-protected-image] img";

/**
 * 공개 이미지의 브라우저 기본 동작(우클릭 메뉴·드래그·선택)을 한 번의 document 캡처
 * 리스너로 차단한다. 각 이미지 컴포넌트를 client boundary 로 바꾸지 않도록 영역 표시는
 * data 속성으로 분리한다.
 *
 * 대상은 표시된 영역이 아니라 그 안의 `img` 다. 래퍼는 링크나 hero 전체를 감싸는 경우가
 * 있어 범위로 잡으면 사진 제목과 촬영 정보까지 복사할 수 없게 된다.
 *
 * @returns {void}
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
