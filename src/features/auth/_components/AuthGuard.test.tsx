// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pathname: "/admin/photos",
  replace: vi.fn(),
  // 로그인하지 않은 상태를 곧바로 알린다. 콜백을 부르지 않으면 `loading` 이 true 로 남아
  // 가드가 판별 전 상태에서 기다리고, 리다이렉트도 아직 일어나지 않는다.
  subscribeAuth: vi.fn((callback: (user: null) => void) => {
    callback(null);
    return () => undefined;
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ replace: state.replace }),
}));
// 실제 Supabase 를 부르지 않는 이유는 이 파일이 검증하려는 것이 "구독을 여느냐" 이기 때문이다.
// 설정 없이 모듈을 불러올 수 있는지는 `lib/supabase/client.test.ts` 가 따로 본다.
vi.mock("@/lib/supabase/auth", () => ({
  subscribeAuth: state.subscribeAuth,
  isAdminUser: (user: unknown) => user != null,
}));

import { AuthGuard } from "@/features/auth/_components/AuthGuard";

const ADMIN_CONTENT = "관리자 화면 콘텐츠";

const renderGuard = () =>
  render(
    <AuthGuard>
      <p>{ADMIN_CONTENT}</p>
    </AuthGuard>,
  );

describe("AuthGuard — 테스트 관리자 세션", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    state.pathname = "/admin/photos";
    state.replace.mockClear();
    state.subscribeAuth.mockClear();
  });

  it("일반 관리자 화면의 콘텐츠까지 렌더한다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "1");

    renderGuard();

    // 빈 게이트가 아니라 실제 children 이 나와야 한다. "throw 하지 않는다" 만 보면
    // aria-busy 게이트에서 멈춘 상태도 통과해 버린다.
    expect(screen.getByText(ADMIN_CONTENT)).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("Supabase 인증 구독을 시작하지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "1");

    renderGuard();

    expect(state.subscribeAuth).not.toHaveBeenCalled();
  });

  it("세션이 꺼져 있으면 평소대로 구독하고 로그인으로 보낸다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "0");

    renderGuard();

    expect(state.subscribeAuth).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(ADMIN_CONTENT)).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/admin/login");
  });

  it("로그인 화면은 세션과 무관하게 통과시킨다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "0");
    state.pathname = "/admin/login";

    renderGuard();

    expect(screen.getByText(ADMIN_CONTENT)).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });
});
