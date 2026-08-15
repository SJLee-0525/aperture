import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    mocks.createClient(...args);
    return { auth: { getClaims: mocks.getClaims } };
  },
}));

/** verifier 싱글턴이 테스트 간에 남지 않도록 매번 모듈을 새로 불러온다. */
const load = async () => (await import("@/lib/auth/verify-admin-id-token")).verifyAdminIdToken;

const claimsResponse = (role: unknown) => ({
  data: { claims: { app_metadata: role === undefined ? {} : { role } } },
  error: null,
});

describe("verifyAdminIdToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("빈 토큰은 검증 호출 없이 거부한다", async () => {
    const verify = await load();
    await expect(verify("")).resolves.toBe(false);
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it("Supabase 설정이 없으면 거부한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const verify = await load();
    await expect(verify("token")).resolves.toBe(false);
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it("admin role 클레임이면 통과하고, 검증 클라이언트는 세션을 만들지 않는다", async () => {
    mocks.getClaims.mockResolvedValue(claimsResponse("admin"));
    const verify = await load();

    await expect(verify("admin-token")).resolves.toBe(true);
    expect(mocks.getClaims).toHaveBeenCalledWith("admin-token");
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "sb_publishable_test",
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  });

  it("role 클레임이 없으면 거부한다", async () => {
    mocks.getClaims.mockResolvedValue(claimsResponse(undefined));
    const verify = await load();
    await expect(verify("token")).resolves.toBe(false);
  });

  it("admin 이 아닌 role 은 거부한다", async () => {
    mocks.getClaims.mockResolvedValue(claimsResponse("editor"));
    const verify = await load();
    await expect(verify("token")).resolves.toBe(false);
  });

  it("서명·만료 검증 실패 응답은 거부한다", async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    const verify = await load();
    await expect(verify("token")).resolves.toBe(false);
  });

  it("검증 중 예외도 거부한다", async () => {
    mocks.getClaims.mockRejectedValue(new Error("jwks fetch failed"));
    const verify = await load();
    await expect(verify("token")).resolves.toBe(false);
  });
});
