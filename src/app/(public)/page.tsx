import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/**
 * 임시 루트 — Phase A3에서 LandingView(이름·태그라인 + 3섹션 진입 허브)로 교체한다.
 * 그 전까지 `/` 는 사진 섹션(작업)으로 보낸다.
 */
export default function RootPage() {
  redirect(ROUTES.PHOTO);
}
