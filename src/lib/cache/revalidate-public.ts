"use server";

import { revalidatePath } from "next/cache";

import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";

/**
 * 공개 페이지 ISR 캐시 전체 무효화 — 검증된 관리자만 호출할 수 있는 server action.
 *
 * 쓰기 자체는 브라우저의 클라 SDK(관리자 Auth 토큰 → Rules isAdmin)로 하므로
 * 서버로 옮길 수 없다(원칙 #1·#5). 서버가 하는 일은 캐시 무효화 딱 하나다.
 * 콘텐츠가 소량이고 저장 주체가 관리자 1명뿐이라 경로별 매핑 대신
 * 루트 layout 전체를 무효화한다(랜딩·검색이 전 섹션 데이터를 쓰므로 매핑 누락 위험 회피).
 *
 * Firebase Auth REST가 ID token을 검증하고 관리자 UID와 일치할 때만 실행해,
 * 공개 호출자가 캐시 무효화와 Firestore 재조회를 반복하는 비용 공격을 막는다.
 */
const revalidatePublicPages = async (idToken: string): Promise<void> => {
  if (!(await verifyAdminIdToken(idToken))) {
    throw new Error("Unauthorized cache revalidation");
  }
  revalidatePath("/", "layout");
};

export { revalidatePublicPages };
