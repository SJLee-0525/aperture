"use client";

import { StatusView } from "@/features/status/_components/StatusView";

import { useLang } from "@/features/lang/_hooks/use-lang";

/**
 * 로케일 세그먼트 밖 404. `/bogus` 처럼 언어를 담지 않은 주소가 여기로 온다.
 * 이 파일은 루트 레이아웃 하위라 스토어 모드 LangProvider 를 읽는다. URL 에 언어가 없으니
 * 저장된 선호를 쓰는 것이 맞다. `/en/bogus` 같은 로케일 안의 404 는 `[lang]/not-found.tsx` 다.
 *
 * @returns 저장된 언어의 404 안내 화면.
 */
export default function NotFound() {
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
