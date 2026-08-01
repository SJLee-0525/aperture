import { LandingView } from "@/features/landing/_components/LandingView";
import { getSite } from "@/lib/content/site";

export const revalidate = 3600;

/** 랜딩 허브 (/) — 이름·태그라인 + 사진/음악/개발 진입. */
export default async function RootPage() {
  const site = await getSite();
  return <LandingView site={site} />;
}
