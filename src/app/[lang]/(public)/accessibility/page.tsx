import type { Metadata } from "next";

import { LegalDocumentView } from "@/features/legal/_components/LegalDocumentView";
import { getLegalDocument } from "@/features/legal/_lib/legal-documents";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

/** Next.js가 언어 세그먼트를 비동기로 전달하는 접근성 안내 라우트 props. */
type Props = { params: Promise<{ lang: Lang }> };

/**
 * 접근성 안내 페이지의 언어별 SEO 메타데이터를 만든다.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params - URL 언어 세그먼트 Promise.
 * @returns {Promise<Metadata>} canonical과 hreflang을 포함한 메타데이터.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "접근성 안내", en: "Accessibility Statement" },
    description: {
      ko: "포트폴리오의 웹 접근성 목표, 적용 조치, 알려진 제한과 피드백 방법입니다.",
      en: "Accessibility goals, measures, known limitations, and feedback options for this portfolio.",
    },
    pathname: "/accessibility",
  });
}

/**
 * 현재 URL 언어의 접근성 안내를 렌더한다.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params - URL 언어 세그먼트 Promise.
 * @returns {Promise<JSX.Element>}
 */
export default async function AccessibilityPage({ params }: Props): Promise<React.JSX.Element> {
  const { lang } = await params;
  return <LegalDocumentView document={getLegalDocument("accessibility", lang)} />;
}
