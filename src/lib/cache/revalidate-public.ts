"use server";

import { revalidatePath, updateTag } from "next/cache";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { requireAdminToken } from "@/lib/auth/admin-gate";

/** 캐시 태그로 쓸 수 있는 형태. 컬렉션·문서 ID 가 쓰는 문자 집합에 맞춘다. */
const REVALIDATABLE_TAG_PATTERN = /^[\w:-]{1,256}$/;

const isRevalidatableTag = (tag: string): boolean => REVALIDATABLE_TAG_PATTERN.test(tag);

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
 * @param [paths] 라우트 캐시까지 지울 리터럴 공개 경로 (`/ko/...`).
 */
const revalidatePublicPages = async (
  idToken: string,
  tags: string[],
  paths: string[] = [],
): Promise<void> => {
  await requireAdminToken(idToken, "cache revalidation");
  for (const tag of new Set(tags)) {
    // 값의 출처는 관리자 브라우저의 localStorage 다. 경로가 받는 것과 같은 수준으로 형태를
    // 확인해, 한쪽만 검사가 없어 다음에 이 코드를 읽는 사람이 의도된 차이로 읽지 않게 한다.
    if (isRevalidatableTag(tag)) updateTag(tag);
  }
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
  // 컬렉션 태그와 같은 즉시 만료를 쓴다. revalidateTag(tag, "max") 는 stale 표시라
  // 다음 요청이 낡은 값을 그대로 쓰는데, 이 자리는 관리자가 방금 비공개로 바꾼 항목이
  // 챗 답변에 실리지 않아야 하는 read-your-own-writes 경로다.
  // Route Handler 는 updateTag 를 쓸 수 없어(Next 제약) RAG 재생성 경로는 여전히
  // revalidateTag 다. 그쪽은 배경 갱신이라 즉시성이 필요 없다.
  updateTag(CHAT_PROFILE_CACHE_TAG);
};

export { revalidatePublicPages };
