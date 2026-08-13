"use client";

import { createContext, useMemo, useSyncExternalStore } from "react";

import { DICTIONARY, type UIDict } from "@/constants/dictionary";
import { DEFAULT_LANG, LANGS } from "@/constants/langs";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";
import { writeLocalePreferenceCookie } from "@/features/lang/_lib/locale-preference-cookie";

import type { Lang } from "@/types/lang";

type LangContextValue = {
  lang: Lang;
  dict: UIDict;
  setLang: (lang: Lang) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

/* localStorage를 사용할 수 없을 때도 세션 동안 유지할 언어 캐시. */
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
    // localStorage를 사용할 수 없으면 기본 언어를 사용한다.
  }
  return DEFAULT_LANG;
};

const readServerLangSnapshot = (): Lang => DEFAULT_LANG;

/**
 * 명시적 언어 선택을 메모리, localStorage와 서버용 기능성 쿠키에 동기화한다.
 *
 * @param {Lang} next - 사용자가 선택한 지원 언어.
 * @returns {void}
 */
const writeLang = (next: Lang): void => {
  langCache = next;
  writeLocalePreferenceCookie(next);
  try {
    localStorage.setItem(STORAGE_KEYS.LANG, next);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.LANG);
  } catch {
    // 영속만 포기
  }
  langListeners.forEach((listener) => listener());
};

type LangProviderProps = {
  /** 공개 경로의 언어 세그먼트. 생략하면 저장된 언어를 사용한다. */
  lang?: Lang;
  children: React.ReactNode;
};

/**
 * 두 가지 모드:
 * 공개 경로에서는 URL 세그먼트를, 그 밖의 화면에서는 저장된 값을 언어로 사용한다.
 *   SSR부터 해당 언어로 렌더된다. 다른 언어로의 "이동"은 LangMenu가 담당한다
 * 언어 변경은 두 모드 모두 저장소에 기록한다.
 * - 스토어 모드(prop 없음, 관리자·에러 페이지): 기존 localStorage + 모듈 스토어 동작 유지.
 *
 * @param {LangProviderProps} props
 * @param {Lang | undefined} props.lang 공개 경로의 언어 세그먼트.
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
const LangProvider = ({ lang: routeLang, children }: LangProviderProps) => {
  const storeLang = useSyncExternalStore(subscribeLang, readLangSnapshot, readServerLangSnapshot);
  const lang = routeLang ?? storeLang;

  // 언어가 같으면 context 소비자가 다시 렌더되지 않도록 객체 참조를 유지한다.
  const value = useMemo(() => ({ lang, dict: DICTIONARY[lang], setLang: writeLang }), [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export { LangContext, LangProvider };
