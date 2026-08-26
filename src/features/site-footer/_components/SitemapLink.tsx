"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { localizePath, stripLangPrefix } from "@/lib/i18n/locale-path";

import type { Lang } from "@/types/lang";

type Props = {
  lang: Lang;
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * 푸터 사이트맵 링크. `SiteFooter` 는 서버 컴포넌트라 경로를 모르므로 현재 위치 판정만
 * 클라이언트로 내린다. 링크 하나를 감싸는 범위라 푸터 전체가 클라이언트가 되지 않는다.
 *
 * 판정은 무-로케일 경로의 완전 일치다. 접두사로 비교하면 `/ko/photo/albums` 에서 사진 섹션
 * 제목까지 현재로 표시된다. 개발 섹션은 컬럼 제목과 첫 하위 링크의 href 가 같아 완전 일치에서도
 * 둘 다 표시되며, 둘 다 현재 지면을 가리키므로 맞는 표시다.
 */
const SitemapLink = ({ lang, href, className, children }: Props) => {
  const current = stripLangPrefix(usePathname()) === href;

  return (
    <Link
      href={localizePath(lang, href)}
      className={className}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
};

export { SitemapLink };
