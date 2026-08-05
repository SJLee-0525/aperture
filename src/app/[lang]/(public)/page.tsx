import type { Metadata } from "next";

import { LANGS } from "@/constants/langs";
import { ROUTES } from "@/constants/routes";
import { LandingView } from "@/features/landing/_components/LandingView";
import { getSite } from "@/lib/content/site";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { languageAlternates, OG_LOCALE } from "@/lib/seo/metadata";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo/site-meta";

import type { Lang } from "@/types/lang";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: Lang }> };

/** 랜딩은 title template 미적용(absolute) — 사이트 대표 제목 그대로. 설명·canonical·hreflang만 언어별. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const description = pickText(SITE_DESCRIPTION, lang);
  const canonical = localizePath(lang, ROUTES.LANDING);

  return {
    title: { absolute: SITE_TITLE },
    description,
    alternates: {
      canonical,
      languages: languageAlternates(ROUTES.LANDING),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((other) => other !== lang).map((other) => OG_LOCALE[other]),
      title: SITE_TITLE,
      description,
      url: canonical,
    },
    twitter: {
      title: SITE_TITLE,
      description,
    },
  };
}

/** 랜딩 허브 (/[lang]) — 이름·태그라인 + 사진/음악/개발 진입. */
export default async function RootPage() {
  const site = await getSite();
  return <LandingView tagline={site.tagline} landingLead={site.landingLead} />;
}
