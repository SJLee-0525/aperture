/** 루트 언어 협상과 클라이언트 언어 메뉴가 공유하는 first-party 선호 쿠키 이름. */
const LOCALE_PREFERENCE_COOKIE = "ap-lang-pref-v1";
/** 언어 선호 쿠키의 30일 보유 기간. `Max-Age`에 전달하므로 단위는 초다. */
const LOCALE_PREFERENCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export { LOCALE_PREFERENCE_COOKIE, LOCALE_PREFERENCE_MAX_AGE_SECONDS };
