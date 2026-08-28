import {
  LOCALE_PREFERENCE_COOKIE,
  LOCALE_PREFERENCE_MAX_AGE_SECONDS,
} from "@/constants/locale-preference";

import type { Lang } from "@/types/lang";

/**
 * 언어 메뉴의 명시적 선택을 서버가 읽을 수 있는 최소 first-party 쿠키로 기록한다.
 *
 * @param lang - 사용자가 메뉴에서 선택한 지원 언어.
 * @returns 쿠키 쓰기가 차단돼도 예외를 외부로 전파하지 않는다.
 */
const writeLocalePreferenceCookie = (lang: Lang): void => {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_PREFERENCE_COOKIE}=${lang}; Max-Age=${LOCALE_PREFERENCE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // 쿠키가 차단돼도 현재 URL 언어 전환과 localStorage 선호는 계속 동작한다.
  }
};

export { writeLocalePreferenceCookie };
