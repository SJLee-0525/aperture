import { NextResponse } from "next/server";

import { authorizeAdminToken, bearerToken } from "@/lib/auth/authorize-admin-token";
import { isTestAdminSessionEnabled } from "@/lib/auth/test-admin-session";

type AdminGateOptions = {
  /**
   * 개발·E2E 전용 세션 우회를 이 표면에 허용할지.
   *
   * 기본은 거부다. 우회를 여는 것은 그 표면이 저장·삭제·캐시 무효화를 하지 않고,
   * E2E 가 매 호출마다 Upstash 를 부르는 비용이 실익보다 클 때뿐이다.
   * 지금 여는 곳은 글 미리보기 하나다.
   */
  allowTestSession?: boolean;
};

/**
 * 관리자 토큰 판정을 응답·예외 두 표현으로 나누기 전의 공통 단계.
 *
 *   통과 여부. `retryAfterSeconds` 가 있으면 스로틀, 없으면 인증 실패다.
 */
const checkAdminToken = async (
  idToken: string,
  options?: AdminGateOptions,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds?: number }> => {
  // 스로틀을 우회 뒤에 둔다. 앞에 두면 E2E 가 호출마다 Upstash 를 부른다.
  if (options?.allowTestSession && isTestAdminSessionEnabled()) return { ok: true };

  const verdict = await authorizeAdminToken(idToken);
  if (verdict.status === "ok") return { ok: true };
  if (verdict.status === "throttled") {
    return { ok: false, retryAfterSeconds: verdict.retryAfterSeconds };
  }
  return { ok: false };
};

/**
 * Route Handler 용 관리자 게이트.
 *
 * 실패 응답 형태를 여기서만 정한다. 호출부마다 접으면 401 본문이 경로마다 달라지고
 * 429 의 `Retry-After` 를 빠뜨린 곳이 생긴다.
 *
 * 문구가 한국어인 이유는 관리자 화면이 이 본문을 그대로 보여 주기 때문이다
 * (`generate-portfolio-embeddings.ts:22` 외 2곳이 `payload.error` 를 오류 문구로 쓴다).
 * 예외를 던지는 `requireAdminToken` 쪽은 서버 로그가 독자라 영어 레이블을 쓴다.
 *
 * @param request `Authorization: Bearer` 를 담은 요청.
 * @param [options] 표면별 예외 설정.
 * @returns 거절 응답. 통과하면 `null`.
 */
const adminGateResponse = async (
  request: Request,
  options?: AdminGateOptions,
): Promise<Response | null> => {
  const verdict = await checkAdminToken(bearerToken(request), options);
  if (verdict.ok) return null;
  if (verdict.retryAfterSeconds !== undefined) {
    return NextResponse.json(
      { error: "인증 실패가 반복돼 잠시 차단되었습니다." },
      {
        status: 429,
        headers: { "Retry-After": String(verdict.retryAfterSeconds) },
      },
    );
  }
  return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
};

/**
 * Server Action 용 관리자 게이트. 실패를 예외로 알린다.
 *
 * Server Action 은 상태 코드를 돌려줄 자리가 없어 Route Handler 와 표현이 다르다.
 * 문구에 대상 이름을 넣어 어느 동작이 막혔는지 서버 로그에서 구분한다.
 *
 * @param idToken 관리자 access token.
 * @param label 오류 문구에 넣을 동작 이름.
 * @param [options] 표면별 예외 설정.
 * @returns 통과하면 완료된다.
 * @throws {Error} 스로틀에 걸렸거나 관리자가 아닐 때.
 */
const requireAdminToken = async (
  idToken: string,
  label: string,
  options?: AdminGateOptions,
): Promise<void> => {
  const verdict = await checkAdminToken(idToken, options);
  if (verdict.ok) return;
  if (verdict.retryAfterSeconds !== undefined) {
    throw new Error(`Too many failed ${label} attempts`);
  }
  throw new Error(`Unauthorized ${label}`);
};

export { adminGateResponse, requireAdminToken };
