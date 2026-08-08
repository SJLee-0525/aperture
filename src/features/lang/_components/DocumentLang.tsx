"use client";

import { useEffect } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";

/**
 * `<html lang>`을 현재 언어와 동기화 — 루트 layout은 `[lang]` 세그먼트를 모르므로
 * (SSR 기본 ko) 공개 트리·관리자에서 각각 마운트해 교정한다. 첫 페인트 교정은
 * `[lang]/layout.tsx`의 LANG_INIT 인라인 스크립트가, 이후 전환은 이 effect가 담당.
 *
 * @returns {null}
 */
const DocumentLang = () => {
  const { lang } = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
};

export { DocumentLang };
