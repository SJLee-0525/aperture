"use server";

import { revalidateTag, updateTag } from "next/cache";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";

/**
 * 변경된 Firestore 데이터에 의존하는 공개 캐시만 무효화한다.
 *
 * 쓰기 자체는 브라우저의 클라 SDK(관리자 Auth 토큰 → Rules isAdmin)로 하므로
 * 서버로 옮길 수 없다(원칙 #1·#5). 서버가 하는 일은 캐시 무효화 딱 하나다.
 * 클라이언트가 컬렉션/문서 태그를 보내면 해당 Data Cache와 이에 의존하는
 * Full Route Cache만 재검증한다.
 *
 * Firebase Auth REST가 ID token을 검증하고 관리자 UID와 일치할 때만 실행해,
 * 공개 호출자가 캐시 무효화와 Firestore 재조회를 반복하는 비용 공격을 막는다.
 *
 * @param {string} idToken
 * @param {string[]} tags
 * @returns {Promise<void>}
 */
const revalidatePublicPages = async (idToken: string, tags: string[]): Promise<void> => {
  if (!(await verifyAdminIdToken(idToken))) {
    throw new Error("Unauthorized cache revalidation");
  }
  for (const tag of new Set(tags)) updateTag(tag);
  revalidateTag(CHAT_PROFILE_CACHE_TAG, "max");
};

export { revalidatePublicPages };
