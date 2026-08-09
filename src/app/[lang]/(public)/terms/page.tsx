import type { Metadata } from "next";

import { LegalDocumentView } from "@/features/legal/_components/LegalDocumentView";
import { getLegalDocument } from "@/features/legal/_lib/legal-documents";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

/** Next.js가 언어 세그먼트를 비동기로 전달하는 이용 안내 라우트 props. */
type Props = { params: Promise<{ lang: Lang }> };

/**
 * 사이트 이용 및 콘텐츠 안내의 언어별 SEO 메타데이터를 만든다.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params - URL 언어 세그먼트 Promise.
 * @returns {Promise<Metadata>} canonical과 hreflang을 포함한 메타데이터.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "사이트 이용 및 콘텐츠 안내", en: "Site Use & Content Notice" },
    description: {
      ko: "포트폴리오 콘텐츠의 저작권, 이용 범위, 외부 링크와 AI 챗봇 안내입니다.",
      en: "Copyright, permitted use, external links, and AI chatbot terms for this portfolio.",
    },
    pathname: "/terms",
  });
}

/**
 * 현재 URL 언어의 사이트 이용 및 콘텐츠 안내를 렌더한다.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params - URL 언어 세그먼트 Promise.
 * @returns {Promise<JSX.Element>}
 */
export default async function TermsPage({ params }: Props): Promise<React.JSX.Element> {
  const { lang } = await params;
  return <LegalDocumentView document={getLegalDocument("terms", lang)} />;
}
