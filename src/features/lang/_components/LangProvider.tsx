"use client";

import { createContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { DICTIONARY, type UIDict } from "@/constants/dictionary";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { DEFAULT_LANG, LANGS, type Lang } from "@/types/lang";

type LangContextValue = {
  lang: Lang;
  dict: UIDict;
  setLang: (lang: Lang) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

/* 모듈 스토어 — localStorage가 막힌 환경에서도 세션 내 전환이 동작하도록 캐시를 둔다 */
let langCache: Lang | null = null;
const langListeners = new Set<() => void>();

const subscribeLang = (listener: () => void) => {
  langListeners.add(listener);
  return () => {
    langListeners.delete(listener);
  };
};

const readLangSnapshot = (): Lang => {
  if (langCache) {
    return langCache;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG);
    if (saved && LANGS.includes(saved as Lang)) {
      langCache = saved as Lang;
      return langCache;
    }
  } catch {
    // localStorage 비활성 환경 — 기본 언어
  }
  return DEFAULT_LANG;
};

const readServerLangSnapshot = (): Lang => DEFAULT_LANG;

const writeLang = (next: Lang) => {
  langCache = next;
  try {
    localStorage.setItem(STORAGE_KEYS.LANG, next);
  } catch {
    // 영속만 포기
  }
  langListeners.forEach((listener) => listener());
};

/**
 * SSR은 항상 ko 스냅샷으로 렌더 → hydration mismatch 없음.
 * 저장값이 en이면 hydration 직후 useSyncExternalStore가 클라이언트 스냅샷으로
 * 한 번 재렌더 (수용한 트레이드오프 — 쿠키 SSR 분기는 ISR을 깨므로 기각).
 */
const LangProvider = ({ children }: { children: React.ReactNode }) => {
  const lang = useSyncExternalStore(subscribeLang, readLangSnapshot, readServerLangSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // 값 객체 정체성 고정 — lang이 그대로면 useLang 소비자(헤더·메뉴·모달 등) 재렌더를 만들지 않는다.
  const value = useMemo(() => ({ lang, dict: DICTIONARY[lang], setLang: writeLang }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export { LangContext, LangProvider };
