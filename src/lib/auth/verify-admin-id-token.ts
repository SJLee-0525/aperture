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
 * 토큰 형태를 미리 걸러내지 않는다. `getClaims` 는 `decodeJWT` 로 3-part 분리와 base64url
 * 형식을 먼저 확인하고 그다음 만료, 마지막에 JWKS 조회 순으로 진행한다. 같은 검사를 앞에
 * 두어도 절약되는 네트워크 왕복은 없다. 미인증 요청의 비용은 `admin-auth-throttle` 이 막는다.
 *
 * `iss` 와 `aud` 는 검증하지 않는다. JWKS 를 이 프로젝트의 `/auth/v1` 에서만 받고 대칭 키
 * 폴백도 같은 프로젝트로 검증하므로 발급자가 암묵적으로 고정된다. 프로젝트를 하나 더 쓰거나
 * 서명 키를 회전할 때는 이 계약이 깨지므로 두 클레임을 명시적으로 검사해야 한다.
 *
 * 로그아웃해도 이미 발급된 토큰은 `exp` 까지 통과한다. 이 함수는 JWKS 로 로컬 검증만 하고
 * Supabase 서버의 세션 해지 여부를 조회하지 않는다. 비대칭 서명 JWT 의 성질이며,
 * 토큰이 유출된 상황에서 로그아웃은 대응이 되지 않는다.
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
