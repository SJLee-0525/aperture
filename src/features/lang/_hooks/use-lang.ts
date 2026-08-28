"use client";

import { useContext } from "react";

import { LangContext } from "@/features/lang/_components/LangProvider";

/**
 * 현재 언어 + UI 사전 + 전환 함수 — LangProvider 하위에서만 사용 가능
 */
const useLang = () => {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error("useLang은 <LangProvider> 안에서만 사용할 수 있습니다");
  }
  return context;
};

export { useLang };
