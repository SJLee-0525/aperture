import { DevStackView } from "@/features/dev/_components/DevStackView";
import { getDevConfig } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Tech Stack",
  description: "개발자 이성준이 사용하는 기술과 도구를 소개합니다.",
  pathname: "/dev",
});

export const revalidate = 3600;

/** 개발 — 기술 스택 (/dev). */
export default async function DevPage() {
  const config = await getDevConfig();
  return <DevStackView config={config} />;
}
