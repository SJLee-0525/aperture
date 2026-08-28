import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

/**
 * 브라우저 Auth·관리자 쓰기용 Supabase 싱글턴은 값이 아니라 함수로 내보낸다.
 *
 * 값으로 두면 이 모듈을 import 하는 순간 `createClient` 가 돌고, 설정이 없으면 그 자리에서
 * 예외로 멈춘다. 관리자 화면은 트리 어딘가에서 반드시 이 모듈에 닿으므로 mock 모드 개발과
 * 프리렌더 중 Client Component 를 평가하는 빌드가 함께 막힌다. 호출 시점으로 미루면 실제로
 * Auth·DB·Storage 를 쓰는 코드만 설정을 요구한다.
 *
 * 반환은 동기다. Promise 로 바꾸면 저장소 getter 를 쓰는 hook 의 의존성 배열이 매 렌더
 * 무효화되어 재조회 루프가 된다. 여기서 미루는 것은 모듈 평가 시점이지 호출 규약이 아니다.
 *
 * 서버 토큰 검증은 이 싱글턴을 쓰지 않는다. 세션 지속 옵션이 다르므로
 * `lib/auth/verify-admin-id-token.ts` 가 별도 서버 클라이언트를 갖는다.
 *
 * @returns 세션을 localStorage 에 지속하는 브라우저 클라이언트.
 */
const getSupabaseClient = (): SupabaseClient =>
  (browserClient ??= createClient(supabaseUrl(), supabasePublishableKey(), {
    // 이 앱의 로그인 경로는 `signInWithPassword` 하나뿐이다. URL 조각에서 세션을 읽는 기능은
    // 쓰이지 않으면서 입력 표면만 늘린다.
    // 비밀번호 재설정이나 이메일 확인 링크를 도입하면 그 흐름이 이 옵션을 요구하므로 되돌린다.
    auth: { detectSessionInUrl: false },
  }));

export { getSupabaseClient };
