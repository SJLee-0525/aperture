"use client";

import { createContext, useMemo, useSyncExternalStore } from "react";

import { DICTIONARY, type UIDict } from "@/constants/dictionary";
import { DEFAULT_LANG, LANGS } from "@/constants/langs";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";

import type { Lang } from "@/types/lang";

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
    const current = localStorage.getItem(STORAGE_KEYS.LANG);
    const legacy = current == null ? localStorage.getItem(LEGACY_STORAGE_KEYS.LANG) : null;
    const saved = current ?? legacy;
    if (saved && LANGS.includes(saved as Lang)) {
      if (legacy != null) {
        localStorage.setItem(STORAGE_KEYS.LANG, saved);
        localStorage.removeItem(LEGACY_STORAGE_KEYS.LANG);
      }
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
    localStorage.removeItem(LEGACY_STORAGE_KEYS.LANG);
  } catch {
    // 영속만 포기
  }
  langListeners.forEach((listener) => listener());
};

type LangProviderProps = {
  /** 경로 모드 — 공개 `/[lang]/*` 트리에서 URL 세그먼트를 그대로 주입. 생략 시 스토어 모드. */
  lang?: Lang;
  children: React.ReactNode;
};

/**
 * 두 가지 모드:
 * - 경로 모드(lang prop, 공개 `/[lang]/*` 트리): URL 세그먼트가 언어의 단일 출처 —
 *   SSR부터 해당 언어로 렌더된다. 다른 언어로의 "이동"은 LangMenu가 담당한다
 *   (setLang은 어느 모드든 스토어 기록 — 관리자 화면과 선호를 공유).
 * - 스토어 모드(prop 없음, 관리자·에러 페이지): 기존 localStorage + 모듈 스토어 동작 유지.
 */
const LangProvider = ({ lang: routeLang, children }: LangProviderProps) => {
  const storeLang = useSyncExternalStore(subscribeLang, readLangSnapshot, readServerLangSnapshot);
  const lang = routeLang ?? storeLang;

  // 값 객체 정체성 고정 — lang이 그대로면 useLang 소비자(헤더·메뉴·모달 등) 재렌더를 만들지 않는다.
  const value = useMemo(() => ({ lang, dict: DICTIONARY[lang], setLang: writeLang }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export { LangContext, LangProvider };
