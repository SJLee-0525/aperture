"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { sectionFromPath } from "@/constants/sections";

/**
 * 라우트 → `html[data-section]` 세팅. globals.css 의 `html[data-section]` 규칙이 `--accent` 를 오버라이드한다.
 * 렌더 출력 없음. (사진=블루라 첫 페인트 flash 없음 — 음악·개발 정식 페이지 도입 시 no-flash 스크립트 검토.)
 */
const SectionAccent = () => {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.section = sectionFromPath(pathname);
  }, [pathname]);

  return null;
};

export { SectionAccent };
