import { notFound } from "next/navigation";

import { DocumentLang } from "@/features/lang/_components/DocumentLang";
import { LangProvider } from "@/features/lang/_components/LangProvider";

import { langInitScript } from "@/features/lang/_lib/lang-script";

import { isLang, LANGS } from "@/constants/langs";

/**
 * ko·en 두 언어를 빌드 타임에 프리렌더 — 하위 전 공개 페이지에 lang 파라미터를 공급한다
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

// 이 세그먼트에 `dynamicParams = false` 를 두지 않는다. 하위 세그먼트까지 함께 잠겨
// 빌드 후 발행한 글·앨범이 렌더되지 못하고 전역 404 가 된다(자식의 dynamicParams=true 도 무시된다).
// 지원 외 언어는 아래 `isLang` 검사가 404 로 막는다.

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

/**
 * 공개 트리 로케일 셸 — URL `[lang]` 세그먼트가 언어의 단일 출처 (구글 권장: 언어별 별도 URL).
 * 루트 LangProvider(스토어 모드) 안에 경로 모드 Provider를 중첩해 공개 트리의 useLang
 * 소비자들이 URL 언어로 SSR·hydration 되게 한다.
 */
export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <LangProvider lang={lang}>
      <script dangerouslySetInnerHTML={{ __html: langInitScript(lang) }} />
      <DocumentLang />
      {children}
    </LangProvider>
  );
}
