import { isTestAdminSessionEnabled } from "@/lib/auth/test-admin-session";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * 미리보기 server action 에 넘길 관리자 ID token.
 *
 * 테스트 세션에서는 Firebase 를 아예 건드리지 않고 빈 문자열을 준다. 설정이 없으면
 * `getFirebaseAuth()` 가 그 자리에서 `auth/invalid-api-key` 로 던지는데, 서버 액션은 이미
 * 같은 플래그를 보고 토큰 없이 받아 준다. 이 가드가 없으면 서버가 열어 둔 문 앞에서
 * 클라이언트가 먼저 죽어 "Firebase 없이 관리자 개발" 이 미리보기에서만 깨진다.
 *
 * 일반 개발·프로덕션에서는 로그인한 사용자의 토큰을 그대로 꺼낸다. 로그인 전이면 빈
 * 문자열이 가고 서버가 거부한다 — 인증 판정은 서버 몫이다.
 *
 * @returns {Promise<string>} ID token. 테스트 세션이거나 로그인 전이면 빈 문자열.
 */
const adminIdToken = async (): Promise<string> => {
  if (isTestAdminSessionEnabled()) return "";
  return (await getFirebaseAuth().currentUser?.getIdToken()) ?? "";
};

export { adminIdToken };
