import { DevCareerView } from "@/features/dev/_components/DevCareerView";
import { getDevConfig } from "@/lib/content/get-dev-config";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "개발 경력",
  description: "개발자 이성준의 경력과 역할을 시간순으로 살펴보세요.",
  pathname: "/dev/career",
});

export const revalidate = 3600;

/** 개발 — 경력 (/dev/career): 기간·직함·역할·설명 타임라인. */
export default async function DevCareerPage() {
  const config = await getDevConfig();
  return <DevCareerView config={config} />;
}
