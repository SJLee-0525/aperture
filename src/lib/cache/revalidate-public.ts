"use server";

import { revalidatePath } from "next/cache";

/**
 * 공개 페이지 ISR 캐시 전체 무효화 — 관리자 저장 직후 호출되는 유일한 server action.
 *
 * 쓰기 자체는 브라우저의 클라 SDK(관리자 Auth 토큰 → Rules isAdmin)로 하므로
 * 서버로 옮길 수 없다(원칙 #1·#5). 서버가 하는 일은 캐시 무효화 딱 하나다.
 * 콘텐츠가 소량이고 저장 주체가 관리자 1명뿐이라 경로별 매핑 대신
 * 루트 layout 전체를 무효화한다(랜딩·검색이 전 섹션 데이터를 쓰므로 매핑 누락 위험 회피).
 *
 * 무인증 호출도 가능하지만 효과는 "캐시 새로고침 → 다음 방문 시 Firestore REST 재조회"뿐 —
 * 데이터 변경 능력이 없어 보안 경계(Rules)를 건드리지 않는다.
 */
const revalidatePublicPages = async (): Promise<void> => {
  revalidatePath("/", "layout");
};

export { revalidatePublicPages };
