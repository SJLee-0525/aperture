import { DevStackView } from "@/features/dev/_components/DevStackView";
import { getDevConfig } from "@/lib/content/get-dev-config";

export const revalidate = 3600;

/** 개발 — 기술 스택 (/dev). */
export default async function DevPage() {
  const config = await getDevConfig();
  return <DevStackView config={config} />;
}
