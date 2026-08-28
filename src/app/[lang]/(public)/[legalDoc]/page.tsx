import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/features/legal/_components/LegalDocumentView";

import {
  getLegalDocument,
  isLegalDocumentKind,
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_METADATA,
} from "@/features/legal/_lib/legal-registry";

import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

/** Next.js가 언어와 문서 세그먼트를 비동기로 전달하는 법적 문서 라우트 props. */
type Props = { params: Promise<{ lang: Lang; legalDoc: string }> };

/**
 * 이 라우트가 받는 세그먼트를 세 문서로 잠근다.
 *
 * 없으면 `/ko/아무거나` 가 404 대신 이 라우트에 잡힌다. 부모 `[lang]/layout.tsx` 와 달리
 * 자식 세그먼트에 두는 것이라 하위 라우트를 함께 잠그지 않는다.
 */
export const dynamicParams = false;

/** @returns 정적으로 생성할 문서 세그먼트. */
export async function generateStaticParams(): Promise<Array<{ legalDoc: string }>> {
  return LEGAL_DOCUMENT_KINDS.map((legalDoc) => ({ legalDoc }));
}

/**
 * 문서 종류와 언어에 맞는 SEO 메타데이터를 만든다.
 *
 * @param props.params - URL 세그먼트 Promise.
 * @returns canonical과 hreflang을 포함한 메타데이터.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, legalDoc } = await params;
  if (!isLegalDocumentKind(legalDoc)) return {};
  const { title, description } = LEGAL_DOCUMENT_METADATA[legalDoc];
  return pageMetadata({ lang, title, description, pathname: `/${legalDoc}` });
}

/**
 * 현재 URL 언어의 법적 문서를 렌더한다.
 *
 * @param props.params - URL 세그먼트 Promise.
 */
export default async function LegalDocumentPage({ params }: Props): Promise<React.JSX.Element> {
  const { lang, legalDoc } = await params;
  if (!isLegalDocumentKind(legalDoc)) notFound();
  return <LegalDocumentView document={getLegalDocument(legalDoc, lang)} />;
}
