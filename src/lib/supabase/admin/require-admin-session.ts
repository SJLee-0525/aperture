import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * 관리자 읽기 전에 로그인 세션 존재를 확인한다.
 *
 * RLS 는 미인증 조회를 거부하는 대신 공개 행만 돌려주므로, 세션 없이 관리자 목록을
 * 읽으면 초안이 오류 없이 사라진다. 이 가드는 그 상태를 명시적인 로그인 오류로 바꾼다.
 * role 은 다시 검사하지 않는다 — 권한 경계는 RLS 가 담당하고 여기는 UI 오류 명확화용이다.
 * 계정이 관리자 하나뿐이라 "로그인했지만 admin 이 아닌" 상태 자체가 없다. 그런 계정이
 * 생기면 `isAdminUser`(`lib/supabase/auth.ts`)를 여기서 함께 확인해야 한다.
 *
 * @returns {Promise<void>} 세션이 있으면 완료된다.
 */
const requireAdminSession = async (): Promise<void> => {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session) throw new Error("관리자 로그인이 필요합니다.");
};

export { requireAdminSession };
