"use client";

import { useImageProtection } from "@/hooks/use-image-protection";

/**
 * 공개 레이아웃에 이미지 보호용 document 캡처 리스너를 한 번만 설치한다.
 *
 * @returns {null}
 */
const PublicImageProtection = () => {
  useImageProtection();
  return null;
};

export { PublicImageProtection };
