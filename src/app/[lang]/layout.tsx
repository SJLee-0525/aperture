import { notFound } from "next/navigation";

import { isLang, LANGS } from "@/constants/langs";
import { DocumentLang } from "@/features/lang/_components/DocumentLang";
import { LangProvider } from "@/features/lang/_components/LangProvider";
import { langInitScript } from "@/features/lang/_lib/lang-script";

/**
 * ko·en 두 언어를 빌드 타임에 프리렌더 — 하위 전 공개 페이지에 lang 파라미터를 공급한다
 *
 * @returns {{ lang: Lang }[]}
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

/** 지원 외 세그먼트(/fr 등)는 라우팅 레이어에서 즉시 404 — 요청-시 렌더 비용 차단(무료 한도 가드) */
export const dynamicParams = false;

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

/**
 * 공개 트리 로케일 셸 — URL `[lang]` 세그먼트가 언어의 단일 출처 (구글 권장: 언어별 별도 URL).
 * 루트 LangProvider(스토어 모드) 안에 경로 모드 Provider를 중첩해 공개 트리의 useLang
 * 소비자들이 URL 언어로 SSR·hydration 되게 한다.
 *
 * @param {Props} props
 * @param {ReactNode} props.children
 * @param {Promise<{ lang: string }>} props.params
 * @returns {Promise<JSX.Element>}
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
