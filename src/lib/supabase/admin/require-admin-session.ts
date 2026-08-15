import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * 관리자 읽기 전에 로그인 세션 존재를 확인한다.
 *
 * RLS 는 미인증 조회를 거부하는 대신 공개 행만 돌려주므로, 세션 없이 관리자 목록을
 * 읽으면 초안이 오류 없이 사라진다. 이 가드는 그 상태를 명시적인 로그인 오류로 바꾼다.
 * role 은 다시 검사하지 않는다 — 권한 경계는 RLS 가 담당하고 여기는 UI 오류 명확화용이다.
 *
 * @returns {Promise<void>} 세션이 있으면 완료된다.
 */
const requireAdminSession = async (): Promise<void> => {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session) throw new Error("관리자 로그인이 필요합니다.");
};

export { requireAdminSession };
