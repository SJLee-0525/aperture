import { DevCareerView } from "@/features/dev/_components/DevCareerView";
import { getDevConfig } from "@/lib/content/get-dev-config";

export const revalidate = 3600;

/** 개발 — 경력 (/dev/career): 기간·직함·역할·설명 타임라인. */
export default async function DevCareerPage() {
  const config = await getDevConfig();
  return <DevCareerView config={config} />;
}
