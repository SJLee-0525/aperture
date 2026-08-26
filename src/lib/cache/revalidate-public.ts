"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { authorizeAdminToken } from "@/lib/auth/authorize-admin-token";

/**
 * 변경된 DB 데이터에 의존하는 공개 캐시만 무효화한다.
 *
 * 쓰기 자체는 브라우저의 supabase-js(관리자 세션 토큰 → RLS is_admin)로 하므로
 * 서버로 옮길 수 없다(원칙 #1·#5). 서버가 하는 일은 캐시 무효화 딱 하나다.
 * 클라이언트가 컬렉션/문서 태그를 보내면 해당 Data Cache와 이에 의존하는
 * Full Route Cache만 재검증한다.
 *
 * `paths`는 라우트 캐시에 남은 404 항목을 지운다. 발행 전에 렌더되어 캐시된 404는
 * 태그 무효화로 갱신되지 않아 revalidate 주기 동안 유지된다.
 *
 * access token 의 서명·만료와 관리자 클레임을 검증한 뒤에만 실행해,
 * 공개 호출자가 캐시 무효화와 DB 재조회를 반복하는 비용 공격을 막는다.
 *
 * @param {string} idToken
 * @param {string[]} tags
 * @param {string[]} [paths] 라우트 캐시까지 지울 리터럴 공개 경로 (`/ko/...`).
 * @returns {Promise<void>}
 */
const revalidatePublicPages = async (
  idToken: string,
  tags: string[],
  paths: string[] = [],
): Promise<void> => {
  const verdict = await authorizeAdminToken(idToken);
  if (verdict.status === "throttled") {
    throw new Error("Too many failed cache revalidation attempts");
  }
  if (verdict.status !== "ok") {
    throw new Error("Unauthorized cache revalidation");
  }
  for (const tag of new Set(tags)) updateTag(tag);
  for (const path of new Set(paths)) {
    // 경로 형태가 아닌 값과 동적 라우트 패턴은 버린다.
    if (
      path.startsWith("/") &&
      // "//host/path" 는 프로토콜 상대 URL 이라 리터럴 공개 경로가 아니다.
      !path.startsWith("//") &&
      !path.includes("[") &&
      path.length <= 1024
    ) {
      revalidatePath(path);
    }
  }
  revalidateTag(CHAT_PROFILE_CACHE_TAG, "max");
};

export { revalidatePublicPages };
