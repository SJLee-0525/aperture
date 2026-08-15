import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

let verifier: SupabaseClient | null = null;

/**
 * 토큰 검증 전용 서버 클라이언트. 세션을 만들지 않으므로 브라우저 싱글턴과 분리한다.
 * JWKS 공개 키 캐시가 이 인스턴스에 붙어, 요청마다 키를 다시 받지 않는다.
 */
const getVerifier = (): SupabaseClient =>
  (verifier ??= createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }));

/**
 * Supabase access token 의 서명·만료를 검증하고 `app_metadata.role` 로 관리자를 판별한다.
 * 비대칭 서명 키 프로젝트라 검증은 로컬 WebCrypto 로 수행된다.
 * URL·publishable key 와 role 값은 비밀이 아니며, 권한 증명은 검증된 토큰이 담당한다.
 *
 * @param {string} idToken
 * @returns {Promise<boolean>}
 */
const verifyAdminIdToken = async (idToken: string): Promise<boolean> => {
  if (!idToken || !isSupabaseConfigured()) return false;

  try {
    const { data, error } = await getVerifier().auth.getClaims(idToken);
    if (error || !data) return false;
    const role = (data.claims.app_metadata as { role?: unknown } | undefined)?.role;
    return role === "admin";
  } catch {
    return false;
  }
};

export { verifyAdminIdToken };
