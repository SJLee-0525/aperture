import { beforeEach, describe, expect, it, vi } from "vitest";

const checkAdminAuthThrottle = vi.fn();
const recordAdminAuthFailure = vi.fn();
const verifyAdminIdToken = vi.fn();

vi.mock("@/lib/auth/admin-auth-throttle", () => ({
  checkAdminAuthThrottle: (...args: unknown[]) => checkAdminAuthThrottle(...args),
  recordAdminAuthFailure: (...args: unknown[]) => recordAdminAuthFailure(...args),
}));

vi.mock("@/lib/auth/verify-admin-id-token", () => ({
  verifyAdminIdToken: (...args: unknown[]) => verifyAdminIdToken(...args),
}));

const { authorizeAdminToken, bearerToken } = await import("@/lib/auth/authorize-admin-token");

const PASS = { blocked: false, retryAfterSeconds: 0 };

beforeEach(() => {
  checkAdminAuthThrottle.mockReset().mockResolvedValue(PASS);
  recordAdminAuthFailure.mockReset().mockResolvedValue(undefined);
  verifyAdminIdToken.mockReset();
});

describe("authorizeAdminToken", () => {
  it("빈 토큰은 카운터를 건드리지 않고 거절한다", async () => {
    await expect(authorizeAdminToken("")).resolves.toEqual({ status: "unauthorized" });

    expect(checkAdminAuthThrottle).not.toHaveBeenCalled();
    expect(verifyAdminIdToken).not.toHaveBeenCalled();
    expect(recordAdminAuthFailure).not.toHaveBeenCalled();
  });

  it("검증을 통과하면 실패를 기록하지 않는다", async () => {
    verifyAdminIdToken.mockResolvedValue(true);

    await expect(authorizeAdminToken("token")).resolves.toEqual({ status: "ok" });
    expect(recordAdminAuthFailure).not.toHaveBeenCalled();
  });

  it("검증에 실패하면 실패를 기록한다", async () => {
    verifyAdminIdToken.mockResolvedValue(false);

    await expect(authorizeAdminToken("token")).resolves.toEqual({ status: "unauthorized" });
    expect(recordAdminAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("상한을 넘긴 IP 는 검증 전에 막는다", async () => {
    checkAdminAuthThrottle.mockResolvedValue({ blocked: true, retryAfterSeconds: 42 });

    await expect(authorizeAdminToken("token")).resolves.toEqual({
      status: "throttled",
      retryAfterSeconds: 42,
    });
    expect(verifyAdminIdToken).not.toHaveBeenCalled();
  });
});

describe("bearerToken", () => {
  it("Bearer 접두사를 떼어낸다", () => {
    const request = new Request("https://example.test", {
      headers: { authorization: "Bearer abc.def.ghi" },
    });

    expect(bearerToken(request)).toBe("abc.def.ghi");
  });

  it("다른 인증 방식과 헤더 부재는 빈 문자열로 본다", () => {
    const basic = new Request("https://example.test", {
      headers: { authorization: "Basic abc" },
    });

    expect(bearerToken(basic)).toBe("");
    expect(bearerToken(new Request("https://example.test"))).toBe("");
  });
});
