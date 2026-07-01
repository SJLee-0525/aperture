import { ROUTES } from "@/constants/routes";

/** 현재 경로가 네비 항목에 해당하는지. 홈(작업)은 정확히 "/", 나머지는 prefix 매치(앨범 상세 포함). */
const isNavActive = (href: string, pathname: string): boolean =>
  href === ROUTES.HOME ? pathname === ROUTES.HOME : pathname.startsWith(href);

export { isNavActive };
