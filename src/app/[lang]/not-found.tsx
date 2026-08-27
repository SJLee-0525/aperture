"use client";

import { StatusView } from "@/features/status/_components/StatusView";

import { useLang } from "@/features/lang/_hooks/use-lang";

/**
 * 로케일 안에서 던져진 404. `[lang]/layout` 의 경로 모드 LangProvider 아래라 저장된 선호가
 * 아니라 URL 의 언어로 렌더된다. `/en/bogus` 를 연 방문자가 한국어 404 를 보지 않는다.
 *
 * @returns {JSX.Element} URL 언어의 404 안내 화면.
 */
export default function LocaleNotFound() {
  const { dict } = useLang();

  return (
    <StatusView
      label="404"
      title={dict.notFoundTitle}
      body={[dict.notFoundBody, dict.notFoundBody2]}
      homeLabel={dict.backHome}
    />
  );
}
