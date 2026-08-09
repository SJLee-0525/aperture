import type { Metadata } from "next";

import { ContactView } from "@/features/contact/_components/ContactView";
import { getSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "연락처", en: "Contact" },
    description: {
      ko: "이성준에게 사진, 음악, 개발 작업과 협업 문의를 보낼 수 있습니다.",
      en: "Get in touch with Sungjoon Lee about photography, music, and development work.",
    },
    pathname: "/contact",
  });
}

/**
 * 연락처 — mailto 폼 + 직접 연락(사이트 링크). site/config 에서 링크·메일 주소 수급.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function ContactPage() {
  const site = await getSite();
  return <ContactView site={site} />;
}
