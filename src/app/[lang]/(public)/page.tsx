import { LandingView } from "@/features/landing/_components/LandingView";

import { getSite } from "@/lib/content/site";
import { siteMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: Lang }> };

/**
 * 랜딩은 title template 미적용(absolute) — 사이트 대표 제목 그대로. 설명·canonical·hreflang만 언어별.
 *
 * @param {Props} props
 * @param {Promise<{ lang: Lang }>} props.params
 * @returns {Promise<Metadata>}
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return siteMetadata(lang);
}

/**
 * 랜딩 허브 (/[lang]) — 이름·태그라인 + 사진/음악/개발 진입.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function RootPage() {
  const site = await getSite();
  return <LandingView tagline={site.tagline} landingLead={site.landingLead} />;
}
