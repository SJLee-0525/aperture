import { isLang } from "@/constants/langs";

import type { Lang } from "@/types/lang";

/** 로케일 프리픽스를 갖지 않는 경로 — 관리자·API는 언어 세그먼트 밖에 있다. */
const UNLOCALIZED_PREFIXES = ["/admin", "/api"] as const;

const isUnlocalizedPath = (pathname: string): boolean =>
  UNLOCALIZED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/** 경로를 pathname과 나머지(?query#hash)로 분리 */
const splitPath = (path: string): { pathname: string; suffix: string } => {
  const cut = path.search(/[?#]/);
  return cut === -1
    ? { pathname: path, suffix: "" }
    : { pathname: path.slice(0, cut), suffix: path.slice(cut) };
};

/** pathname 첫 세그먼트가 지원 언어면 반환, 아니면 null */
const langFromPath = (pathname: string): Lang | null => {
  const segment = pathname.split("/")[1];
  return segment && isLang(segment) ? segment : null;
};

/** 로케일 프리픽스 제거 — "/ko/photo" → "/photo", "/ko" → "/". 프리픽스가 없으면 그대로. */
const stripLangPrefix = (pathname: string): string => {
  const lang = langFromPath(pathname);
  if (!lang) return pathname;
  return pathname.slice(lang.length + 1) || "/";
};

/**
 * 내부 경로에 언어 프리픽스 부착 — "/photo?x" → "/ko/photo?x", "/" → "/ko".
 * 이미 프리픽스가 있거나 관리자·API·외부 경로면 그대로 반환한다.
 */
const localizePath = (lang: Lang, path: string): string => {
  if (!path.startsWith("/")) return path;
  const { pathname, suffix } = splitPath(path);
  if (isUnlocalizedPath(pathname) || langFromPath(pathname)) return path;
  return `/${lang}${pathname === "/" ? "" : pathname}${suffix}`;
};

/** 현재 경로(프리픽스 유무 무관)를 다른 언어의 같은 페이지 경로로 교체 — 쿼리·해시 보존 */
const switchLangPath = (lang: Lang, path: string): string => {
  const { pathname, suffix } = splitPath(path);
  if (isUnlocalizedPath(pathname)) return path;
  const bare = stripLangPrefix(pathname);
  return `/${lang}${bare === "/" ? "" : bare}${suffix}`;
};

export { langFromPath, localizePath, stripLangPrefix, switchLangPath };
