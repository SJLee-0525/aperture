"use client";

import Link from "next/link";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { localizePath } from "@/lib/i18n/locale-path";

import type { ComponentProps } from "react";

type LocalizedLinkProps = ComponentProps<typeof Link>;

/**
 * 내부 경로에 현재 언어 프리픽스(/ko·/en)를 자동 부착하는 Link 대체재.
 * 관리자(/admin)·API·외부 URL·이미 프리픽스된 경로는 그대로 통과한다.
 * 공개 URL을 만드는 모든 곳은 next/link 대신 이 컴포넌트를 쓴다.
 *
 * @param props.href - The path or URL to navigate to. It can also be an object.
 */
const LocalizedLink = ({ href, ...rest }: LocalizedLinkProps) => {
  const { lang } = useLang();
  const localized = typeof href === "string" ? localizePath(lang, href) : href;
  return <Link href={localized} {...rest} />;
};

export { LocalizedLink };
