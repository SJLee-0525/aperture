import type { Metadata } from "next";

import { DevStackView } from "@/features/dev/_components/DevStackView";
import { getDevConfig } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "기술 스택", en: "Tech Stack" },
    description: {
      ko: "개발자 이성준이 사용하는 기술과 도구를 소개합니다.",
      en: "The technologies and tools used by developer Sungjoon Lee.",
    },
    pathname: "/dev",
  });
}

export const revalidate = 3600;

/**
 * 개발 — 기술 스택 (/dev).
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function DevPage() {
  const config = await getDevConfig();
  return <DevStackView config={config} />;
}
