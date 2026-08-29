import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 이 파일이 지키는 계약: **모듈을 불러오는 것만으로는 Supabase 클라이언트가 생기지 않는다.**
 *
 * 지연 초기화 규약을 검증한다. 값으로 내보내면 설정 없는 mock 모드 개발과
 * 프리렌더 빌드가 import 시점 예외로 함께 막힌다. 생성은 호출 시점으로 미룬다.
 */
describe("supabase client — 지연 초기화", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("설정이 없어도 client·auth 모듈을 불러올 수 있다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(import("@/lib/supabase/client")).resolves.toMatchObject({
      getSupabaseClient: expect.any(Function),
    });
    await expect(import("@/lib/supabase/auth")).resolves.toMatchObject({
      signIn: expect.any(Function),
      subscribeAuth: expect.any(Function),
      getAdminAccessToken: expect.any(Function),
    });
  });

  it("설정 없이 호출하면 그 시점에 예외가 난다", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const { getSupabaseClient } = await import("@/lib/supabase/client");
    expect(() => getSupabaseClient()).toThrow();
  });
});
