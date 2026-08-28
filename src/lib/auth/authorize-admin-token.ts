import { checkAdminAuthThrottle, recordAdminAuthFailure } from "@/lib/auth/admin-auth-throttle";
import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";

/**
 * `throttled` 는 `unauthorized` 와 구분된다. 호출부가 429 와 401 을 나눠 응답해야
 * 정상 관리자가 자기 상태를 알 수 있다.
 */
type AdminAuthVerdict =
  | { status: "ok" }
  | { status: "unauthorized" }
  | { status: "throttled"; retryAfterSeconds: number };

const OK: AdminAuthVerdict = { status: "ok" };
const UNAUTHORIZED: AdminAuthVerdict = { status: "unauthorized" };

/**
 * 관리자 access token 을 검증하고, 실패가 반복되는 IP 를 막는다.
 *
 * 토큰이 비어 있으면 카운터를 건드리지 않고 바로 거절한다. 이 경로는 Supabase 를 부르지
 * 않으므로 증폭이 없고, 세어 봐야 쓰기 한 번만 늘어난다.
 *
 * 관리자 표면 네 곳(Route Handler 2, Server Action 2)이 이 함수 하나를 쓴다.
 * 응답 형태는 호출부가 정한다. Route Handler 는 상태 코드로, Server Action 은 예외로 알린다.
 */
const authorizeAdminToken = async (idToken: string): Promise<AdminAuthVerdict> => {
  if (!idToken) return UNAUTHORIZED;

  const throttle = await checkAdminAuthThrottle();
  if (throttle.blocked) {
    return { status: "throttled", retryAfterSeconds: throttle.retryAfterSeconds };
  }

  if (await verifyAdminIdToken(idToken)) return OK;

  await recordAdminAuthFailure();
  return UNAUTHORIZED;
};

/** `Authorization: Bearer <token>` 에서 토큰만 꺼낸다. 형식이 다르면 빈 문자열. */
const bearerToken = (request: Request): string => {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
};

export { authorizeAdminToken, bearerToken };
