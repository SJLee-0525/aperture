import { LegalDocumentView } from "@/features/legal/_components/LegalDocumentView";

import { getLegalDocument } from "@/features/legal/_lib/legal-documents";

import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

/** Next.js가 언어 세그먼트를 비동기로 전달하는 Privacy 라우트 props. */
type Props = { params: Promise<{ lang: Lang }> };

/**
 * Privacy 페이지의 언어별 SEO 메타데이터를 만든다.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params - URL 언어 세그먼트 Promise.
 * @returns {Promise<Metadata>} canonical과 hreflang을 포함한 메타데이터.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "개인정보 처리방침", en: "Privacy Policy" },
    description: {
      ko: "Sungjoon Lee 포트폴리오의 언어 설정, 방문 분석과 개인정보 처리 방식을 안내합니다.",
      en: "How the Sungjoon Lee portfolio handles language preferences, visitor analytics, and personal data.",
    },
    pathname: "/privacy",
  });
}

/**
 * 현재 URL 언어의 개인정보 처리방침을 렌더한다.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params - URL 언어 세그먼트 Promise.
 * @returns {Promise<JSX.Element>}
 */
export default async function PrivacyPage({ params }: Props): Promise<React.JSX.Element> {
  const { lang } = await params;
  return <LegalDocumentView document={getLegalDocument("privacy", lang)} />;
}
