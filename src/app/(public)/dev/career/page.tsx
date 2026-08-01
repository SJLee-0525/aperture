import { Suspense } from "react";

import { DevCareerView } from "@/features/dev/_components/DevCareerView";
import { getDevConfig } from "@/lib/content/dev";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "개발 경력",
  description: "개발자 이성준의 학력, 경력과 수상 이력을 살펴보세요.",
  pathname: "/dev/career",
});

export const revalidate = 3600;

/** 개발 — 경력 (/dev/career): 학력·경력 타임라인 + 수상. */
export default async function DevCareerPage() {
  const config = await getDevConfig();
  return (
    <Suspense>
      <DevCareerView config={config} />
    </Suspense>
  );
}
