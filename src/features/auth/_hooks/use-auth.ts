"use client";

import { useEffect, useState } from "react";

import { isTestAdminSessionEnabled } from "@/lib/auth/test-admin-session";
import { isAdminUser, subscribeAuth } from "@/lib/supabase/auth";

import type { User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  /** 테스트 세션으로 열린 상태. Supabase 계정은 없고 화면 흐름만 통과시킨다. */
  testSession: boolean;
};

/**
 * 현재 인증 상태 구독. loading=최초 판별 전, isAdmin=로그인 + `app_metadata.role` 일치.
 *
 * 테스트 세션에서는 Supabase 구독을 시작하지 않는다. `subscribeAuth` 가 클라이언트를
 * 만드는 순간 설정이 없으면 예외로 멈추고, 그러면 B3.5 가 약속한
 * "백엔드 설정 없이 관리자 개발" 이 화면을 여는 시점에 깨진다. 구독을 건너뛸 때는 `loading` 도
 * 처음부터 false 다 — true 로 남으면 `AuthGuard` 가 빈 게이트에서 더 나아가지 못한다.
 *
 * 테스트 세션 판정은 렌더마다 조건 없이 실행한다. 다른 값 뒤에 두면 로그인한 관리자에게는
 * `isTestAdminSessionEnabled` 의 프로덕션 가드가 영영 돌지 않아, 플래그가 켜진 채 배포돼도
 * 아무도 알아채지 못한다.
 *
 * @returns {AuthState} 구독 결과. 테스트 세션이면 `user` 는 null, `isAdmin` 도 false 이고
 *   화면을 열지 말지는 호출부가 `testSession` 으로 판단한다.
 */
const useAuth = (): AuthState => {
  const testSession = isTestAdminSessionEnabled();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!testSession);

  useEffect(() => {
    if (testSession) return;

    const unsubscribe = subscribeAuth((next) => {
      setUser(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [testSession]);

  return { user, loading, testSession, isAdmin: isAdminUser(user) };
};

export { useAuth };
