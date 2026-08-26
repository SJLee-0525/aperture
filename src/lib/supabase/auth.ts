import { clearAdminWorkspace } from "@/lib/admin/clear-admin-workspace";
import { getSupabaseClient } from "@/lib/supabase/client";

import type { User } from "@supabase/supabase-js";

/** Supabase Auth 에러 코드 → 한국어 메시지 (로그인 폼 표시용). */
const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  validation_failed: "이메일 형식이 올바르지 않습니다.",
  email_not_confirmed: "이메일 확인이 완료되지 않은 계정입니다.",
  user_banned: "비활성화된 계정입니다.",
  over_request_rate_limit: "시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
  request_timeout: "네트워크 연결을 확인하세요.",
  network: "네트워크 연결을 확인하세요.",
};

/**
 * Supabase Auth 오류를 로그인 폼용 메시지로 바꾼다.
 * 네트워크 실패는 코드가 없는 `AuthRetryableFetchError` 로 오므로 이름으로 판별한다.
 */
const authErrorMessage = (error: { code?: string; name?: string }): string => {
  const code = error.code ?? (error.name === "AuthRetryableFetchError" ? "network" : "");
  return AUTH_ERRORS[code] ?? "로그인에 실패했습니다. 다시 시도하세요.";
};

/**
 * 관리자 로그인. 실패 시 한국어 메시지를 담은 Error 를 throw.
 *
 * @param {string} email 관리자 이메일.
 * @param {string} password 관리자 비밀번호.
 * @returns {Promise<User>} 인증된 Supabase 사용자.
 */
const signIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(authErrorMessage(error));
  return data.user;
};

/**
 * 세션과 함께 편집 중 작업본까지 지운다.
 *
 * 세션만 끊으면 아직 저장하지 않은 글 본문이 브라우저에 남는다. 공용·공유 브라우저에서
 * 다음 사용자가 그 값을 읽을 수 있다.
 *
 * @returns {Promise<void>} 로컬 세션 정리가 끝나면 완료된다. 서버 측 해지 실패는 무시한다.
 */
const signOutAdmin = async (): Promise<void> => {
  await getSupabaseClient().auth.signOut();
  clearAdminWorkspace(window.localStorage, window.sessionStorage);
};

/**
 * 인증 상태 구독. 반환값은 구독 해제 함수.
 * 구독 직후 INITIAL_SESSION 이벤트로 현재 세션이 한 번 전달된다.
 *
 * @param {(user: User | null) => void} callback 인증 사용자가 바뀔 때 실행할 함수.
 * @returns {(() => void)} 인증 상태 구독을 해제하는 함수.
 */
const subscribeAuth = (callback: (user: User | null) => void): (() => void) => {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
};

/**
 * 관리자 판별 단일 출처 — JWT 의 `app_metadata.role`.
 * `user_metadata` 는 사용자가 스스로 수정할 수 있어 판별에 쓰지 않는다.
 * 서버(RLS `is_admin()`, `verifyAdminIdToken`)도 같은 클레임을 본다.
 */
const isAdminUser = (user: User | null): boolean =>
  (user?.app_metadata as { role?: unknown } | undefined)?.role === "admin";

/**
 * server action·API 호출에 붙일 현재 세션의 access token.
 * 만료가 임박하면 supabase-js 가 세션을 갱신한 뒤 돌려준다.
 *
 * @returns {Promise<string | null>} 로그인 전이면 null.
 */
const getAdminAccessToken = async (): Promise<string | null> => {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
};

export { getAdminAccessToken, isAdminUser, signIn, signOutAdmin, subscribeAuth };
