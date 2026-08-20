import type { SiteLink } from "@/types/site";

type PublicUrlOptions = {
  /** 사이트 연락 링크처럼 `mailto:` 스킴이 필요한 경계에서만 활성화한다. */
  allowMailto?: boolean;
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const EMAIL_ADDRESS = /^[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+$/;

/**
 * 공개 콘텐츠 링크를 실행 가능한 안전한 스킴으로 제한한다.
 * 외부 링크는 HTTPS만, 내부 링크는 절대 경로와 해시만 허용한다.
 *
 * @param {unknown} value Firestore 또는 관리자 폼에서 전달된 링크 후보 값.
 * @param {PublicUrlOptions} [options] 링크 스킴 허용 범위.
 * @param {boolean} [options.allowMailto] 단순 이메일 주소만 포함한 `mailto:` 링크를 허용할지 여부.
 * @returns {string} 공백을 정리한 안전한 링크. 값이나 스킴이 허용되지 않으면 빈 문자열.
 */
const normalizePublicHref = (value: unknown, options: PublicUrlOptions = {}): string => {
  if (typeof value !== "string") return "";
  const href = value.trim();
  if (!href || CONTROL_CHARACTERS.test(href)) return "";

  if (href.startsWith("#")) return href;
  // WHATWG URL은 역슬래시를 슬래시처럼 해석할 수 있어 `/\evil.example`도 외부 호스트가 된다.
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) return href;

  if (options.allowMailto && href.toLowerCase().startsWith("mailto:")) {
    try {
      const url = new URL(href);
      return url.protocol === "mailto:" &&
        !url.pathname.includes("%") &&
        EMAIL_ADDRESS.test(url.pathname) &&
        !url.search &&
        !url.hash
        ? href
        : "";
    } catch {
      return "";
    }
  }

  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password ? href : "";
  } catch {
    return "";
  }
};

/** 저장해도 되는 스킴. 나머지 스킴은 링크로 그려지는 순간 코드가 실행될 수 있다. */
const STORABLE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * 저장 경계에서 거부해야 하는 주소인지 본다.
 *
 * 공개 표시 정책(https 전용)과 다른 기준이다. `http://` 는 표시할 수 없을 뿐 저장은
 * 안전하므로 통과시킨다. 막는 것은 `javascript:` 처럼 관리자 화면에서 링크로 그려질 때
 * 실행되는 스킴이다.
 *
 * @param {unknown} value 저장하려는 링크 값.
 * @returns {boolean} 저장하면 안 되는 값이면 true. 빈 값과 상대 경로는 false.
 */
const isDangerousStoredHref = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const href = value.trim();
  if (!href) return false;
  if (CONTROL_CHARACTERS.test(href)) return true;
  if (href.startsWith("#") || href.startsWith("/")) return false;
  const scheme = /^[a-z][a-z0-9+.-]*:/i.exec(href)?.[0];
  // 스킴이 없으면 상대 경로다.
  return scheme ? !STORABLE_SCHEMES.has(scheme.toLowerCase()) : false;
};

/**
 * Firestore의 알 수 없는 링크 배열에서 공개해도 안전한 항목만 남긴다.
 *
 * @param {unknown} value Firestore에서 디코딩한 링크 배열 후보 값.
 * @param {PublicUrlOptions} [options] 각 링크에 적용할 스킴 허용 범위.
 * @param {boolean} [options.allowMailto] 단순 `mailto:` 링크를 허용할지 여부.
 * @returns {SiteLink[]} 라벨과 주소가 모두 유효한 정규화된 공개 링크 목록.
 */
const sanitizePublicLinks = (value: unknown, options: PublicUrlOptions = {}): SiteLink[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const { label, href } = item as Record<string, unknown>;
    if (typeof label !== "string") return [];
    const safeHref = normalizePublicHref(href, options);
    const safeLabel = label.trim();
    return safeLabel && safeHref ? [{ label: safeLabel, href: safeHref }] : [];
  });
};

/**
 * 관리자 입력을 정리하고 불완전하거나 위험한 링크는 저장 전에 거부한다.
 *
 * @param {SiteLink[]} links 관리자 폼에서 편집한 링크 목록.
 * @param {PublicUrlOptions} [options] 각 링크에 적용할 스킴 허용 범위.
 * @param {boolean} [options.allowMailto] 단순 `mailto:` 링크를 허용할지 여부.
 * @returns {SiteLink[]} 빈 행을 제거하고 라벨과 주소의 공백을 정리한 링크 목록.
 * @throws {Error} 내용이 있는 행의 라벨이 비었거나 주소가 허용된 형식이 아닐 때.
 */
const preparePublicLinks = (links: SiteLink[], options: PublicUrlOptions = {}): SiteLink[] =>
  links
    .filter(({ label, href }) => label.trim() || href.trim())
    .map(({ label, href }, index) => {
      const safeLabel = label.trim();
      const safeHref = normalizePublicHref(href, options);
      if (!safeLabel || !safeHref) {
        throw new Error(
          `${index + 1}번째 링크의 라벨과 주소를 확인하세요. 외부 주소는 HTTPS만 사용할 수 있습니다.`,
        );
      }
      return { label: safeLabel, href: safeHref };
    });

/**
 * 검증된 `mailto:` 링크에서 연락 폼 수신 이메일 주소만 추출한다.
 *
 * @param {unknown} value 이메일 링크 후보 값.
 * @returns {string} 쿼리와 해시가 없는 단일 이메일 주소. 유효하지 않으면 빈 문자열.
 */
const mailtoAddress = (value: unknown): string => {
  const href = normalizePublicHref(value, { allowMailto: true });
  return href.toLowerCase().startsWith("mailto:") ? href.slice("mailto:".length) : "";
};

export {
  isDangerousStoredHref,
  mailtoAddress,
  normalizePublicHref,
  preparePublicLinks,
  sanitizePublicLinks,
};
