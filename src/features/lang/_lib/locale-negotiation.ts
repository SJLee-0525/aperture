import Negotiator from "negotiator";

import { DEFAULT_LANG, isLang } from "@/constants/langs";

import type { Lang } from "@/types/lang";

/** Proxy에서 파싱할 `Accept-Language` 헤더의 최대 문자 수. */
const MAX_ACCEPT_LANGUAGE_LENGTH = 512;
/** BCP 47 언어 범위와 최대 소수점 세 자리의 HTTP 품질값을 허용하는 입력 경계. */
const LANGUAGE_RANGE =
  /^(\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i;

/** 브라우저 헤더를 제품의 두 언어 또는 판정 불가 상태로 정규화한 결과. */
type BrowserLanguage = Lang | "default";
/** 최종 언어를 결정한 입력 신호. 운영 분석에는 원본 헤더 대신 이 값만 사용할 수 있다. */
type LocaleDecisionSource = "cookie" | "accept-language" | "default";
/** 루트 리다이렉트의 목적 언어와 판정 출처. */
type LocaleDecision = { lang: Lang; source: LocaleDecisionSource };

/**
 * 비정상 항목을 제거한 뒤 negotiator에 표준 품질값 정렬을 맡긴다.
 * wildcard는 구체적인 브라우저 언어가 아니므로 판정 후보에서 제외한다.
 *
 * @param acceptLanguage - 요청의 원본 `Accept-Language` 헤더.
 * @returns 한국어, 비한국어를 대표하는 영어, 또는 판정 불가 기본값.
 */
const browserLanguage = (acceptLanguage: string | null): BrowserLanguage => {
  if (
    acceptLanguage == null ||
    acceptLanguage.trim() === "" ||
    acceptLanguage.length > MAX_ACCEPT_LANGUAGE_LENGTH
  ) {
    return "default";
  }

  const sanitized = acceptLanguage
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "" && LANGUAGE_RANGE.test(part));

  if (sanitized.length === 0) return "default";

  try {
    const preferred = new Negotiator({
      headers: { "accept-language": sanitized.join(",") },
    })
      .languages()
      .find((language) => language !== "*");

    if (!preferred) return "default";
    return preferred.split("-")[0]?.toLowerCase() === "ko" ? "ko" : "en";
  } catch {
    return "default";
  }
};

/**
 * 명시적 선호 쿠키가 정확히 하나일 때만 신뢰하고, 아니면 브라우저 언어로 폴백한다.
 *
 * @param cookieValues - 같은 이름으로 수신한 언어 쿠키 값 전체.
 * @param acceptLanguage - 요청의 `Accept-Language` 헤더.
 * @returns 최종 언어와 그 결정을 만든 신호.
 */
const decideLocale = (
  cookieValues: readonly string[],
  acceptLanguage: string | null,
): LocaleDecision => {
  const cookieValue = cookieValues.length === 1 ? cookieValues[0] : undefined;
  if (cookieValue && isLang(cookieValue)) return { lang: cookieValue, source: "cookie" };

  const browser = browserLanguage(acceptLanguage);
  if (browser !== "default") return { lang: browser, source: "accept-language" };
  return { lang: DEFAULT_LANG, source: "default" };
};

export { MAX_ACCEPT_LANGUAGE_LENGTH, browserLanguage, decideLocale };
