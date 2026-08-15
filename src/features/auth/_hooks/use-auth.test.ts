// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  callback: null as ((user: unknown) => void) | null,
  subscribeAuth: vi.fn((callback: (user: unknown) => void) => {
    state.callback = callback;
    return () => undefined;
  }),
}));

// isAdminUser 는 실제 구현을 쓴다 — 이 파일이 지키려는 계약이 role 클레임 판별이다.
vi.mock("@/lib/supabase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/auth")>();
  return { ...actual, subscribeAuth: state.subscribeAuth };
});

import { useAuth } from "@/features/auth/_hooks/use-auth";

import type { User } from "@supabase/supabase-js";

const userWithRole = (role?: string): User =>
  ({
    id: "user-1",
    email: "admin@example.com",
    app_metadata: role ? { provider: "email", role } : { provider: "email" },
  }) as unknown as User;

describe("useAuth — role 클레임 판별", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    state.callback = null;
    state.subscribeAuth.mockClear();
  });

  it("app_metadata.role 이 admin 인 사용자만 isAdmin", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "0");
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    act(() => state.callback?.(userWithRole("admin")));

    expect(result.current.loading).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user?.email).toBe("admin@example.com");
  });

  it("role 클레임이 없는 로그인 사용자는 isAdmin 이 아니다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "0");
    const { result } = renderHook(() => useAuth());

    act(() => state.callback?.(userWithRole()));

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).not.toBeNull();
  });

  it("로그아웃 알림이 오면 user 와 isAdmin 을 되돌린다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "0");
    const { result } = renderHook(() => useAuth());

    act(() => state.callback?.(userWithRole("admin")));
    act(() => state.callback?.(null));

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it("테스트 세션은 구독 없이 loading 을 끝내고 isAdmin 은 false 로 남긴다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "1");
    const { result } = renderHook(() => useAuth());

    expect(state.subscribeAuth).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.testSession).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });
});
