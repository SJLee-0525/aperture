import { afterEach, describe, expect, it, vi } from "vitest";

import { isTestAdminSessionEnabled } from "@/lib/auth/test-admin-session";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isTestAdminSessionEnabled", () => {
  it("환경 변수가 없으면 꺼져 있다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", undefined);

    expect(isTestAdminSessionEnabled()).toBe(false);
  });

  it("1 이 아닌 값은 켜지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "true");

    expect(isTestAdminSessionEnabled()).toBe(false);
  });

  it("비-프로덕션에서 1 이면 켜진다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(isTestAdminSessionEnabled()).toBe(true);
  });

  it("프로덕션 빌드에서 켜져 있으면 즉시 실패한다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", "1");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => isTestAdminSessionEnabled()).toThrow(/프로덕션/);
  });

  it("프로덕션이어도 꺼져 있으면 실패하지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_TEST_SESSION", undefined);
    vi.stubEnv("NODE_ENV", "production");

    expect(isTestAdminSessionEnabled()).toBe(false);
  });
});
