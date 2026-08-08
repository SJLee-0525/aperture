import type { Metadata } from "next";

import { DEFAULT_LANG, LANGS } from "@/constants/langs";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { SITE_NAME } from "@/lib/seo/site-meta";

import type { Lang } from "@/types/lang";
import type { LocalizedText } from "@/types/localized";

/** OpenGraph locale 표기 — 언어 코드의 유일한 지역 매핑 */
const OG_LOCALE: Record<Lang, string> = { ko: "ko_KR", en: "en_US" };

/**
 * hreflang 세트 — 전 언어 버전 상호 참조(자기 포함, 구글 양방향 요구) + x-default(기본 언어 ko).
 * 상대 경로는 루트 layout `metadataBase`가 절대 URL로 해석한다 (구글 요구: 완전 수식 URL).
 *
 * @param {string} pathname
 * @returns {Record<string, string>}
 */
const languageAlternates = (pathname: string): Record<string, string> => ({
  ...Object.fromEntries(LANGS.map((lang) => [lang, localizePath(lang, pathname)])),
  "x-default": localizePath(DEFAULT_LANG, pathname),
});

type PageMetadataInput = {
  lang: Lang;
  title: LocalizedText;
  description: LocalizedText;
  /** 무-로케일 공개 경로("/photo") — 언어 프리픽스는 여기서 부착한다 */
  pathname: string;
};

/**
 * 공개 페이지 메타데이터 공통 골격 — 경로 기반 i18n(/ko·/en).
 * - title·description은 URL 언어를 따른다. 언어별 별도 URL이므로 클라 전환과 <title>이
 *   경합하던 문제가 구조적으로 사라짐 (구 "영어 제목 고정" 정책 폐기).
 * - canonical = 현재 언어 URL, hreflang = languageAlternates 세트.
 *
 * @param {PageMetadataInput} options
 * @param {Lang} options.lang
 * @param {LocalizedText} options.title
 * @param {LocalizedText} options.description
 * @param {string} options.pathname - 무-로케일 공개 경로("/photo") — 언어 프리픽스는 여기서 부착한다
 * @returns {Metadata}
 */
const pageMetadata = ({ lang, title, description, pathname }: PageMetadataInput): Metadata => {
  const resolvedTitle = pickText(title, lang);
  const resolvedDescription = pickText(description, lang);
  const canonical = localizePath(lang, pathname);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: {
      canonical,
      languages: languageAlternates(pathname),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((other) => other !== lang).map((other) => OG_LOCALE[other]),
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
    },
    twitter: {
      title: resolvedTitle,
      description: resolvedDescription,
    },
  };
};

export { languageAlternates, OG_LOCALE, pageMetadata };
