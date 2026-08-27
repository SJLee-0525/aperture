import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeAdminToken = vi.fn();
const isTestAdminSessionEnabled = vi.fn(() => false);

vi.mock("@/lib/auth/authorize-admin-token", () => ({
  authorizeAdminToken: (token: string) => authorizeAdminToken(token),
  bearerToken: (request: Request) => {
    const header = request.headers.get("authorization") ?? "";
    return header.startsWith("Bearer ") ? header.slice(7) : "";
  },
}));

vi.mock("@/lib/auth/test-admin-session", () => ({
  isTestAdminSessionEnabled: () => isTestAdminSessionEnabled(),
}));

const { adminGateResponse, requireAdminToken } = await import("@/lib/auth/admin-gate");

const requestWith = (token?: string) =>
  new Request("https://example.com/api/admin/x", {
    method: "POST",
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });

describe("adminGateResponse", () => {
  beforeEach(() => {
    authorizeAdminToken.mockReset();
    isTestAdminSessionEnabled.mockReset().mockReturnValue(false);
  });

  it("통과하면 null 을 돌려준다", async () => {
    authorizeAdminToken.mockResolvedValue({ status: "ok" });

    expect(await adminGateResponse(requestWith("t"))).toBeNull();
  });

  it("인증 실패는 401 과 같은 본문이다", async () => {
    authorizeAdminToken.mockResolvedValue({ status: "unauthorized" });

    const denied = await adminGateResponse(requestWith("t"));

    expect(denied?.status).toBe(401);
    await expect(denied?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("스로틀은 429 와 Retry-After 를 함께 낸다", async () => {
    authorizeAdminToken.mockResolvedValue({ status: "throttled", retryAfterSeconds: 42 });

    const denied = await adminGateResponse(requestWith("t"));

    expect(denied?.status).toBe(429);
    expect(denied?.headers.get("Retry-After")).toBe("42");
  });

  it("Bearer 가 아니면 토큰 없이 판정에 넘긴다", async () => {
    authorizeAdminToken.mockResolvedValue({ status: "unauthorized" });

    await adminGateResponse(requestWith());

    expect(authorizeAdminToken).toHaveBeenCalledWith("");
  });

  it("테스트 세션 우회를 열지 않은 표면은 우회하지 않는다", async () => {
    isTestAdminSessionEnabled.mockReturnValue(true);
    authorizeAdminToken.mockResolvedValue({ status: "unauthorized" });

    expect((await adminGateResponse(requestWith("t")))?.status).toBe(401);
    expect(authorizeAdminToken).toHaveBeenCalled();
  });
});

describe("requireAdminToken", () => {
  beforeEach(() => {
    authorizeAdminToken.mockReset();
    isTestAdminSessionEnabled.mockReset().mockReturnValue(false);
  });

  it("통과하면 던지지 않는다", async () => {
    authorizeAdminToken.mockResolvedValue({ status: "ok" });

    await expect(requireAdminToken("t", "cache revalidation")).resolves.toBeUndefined();
  });

  it("실패 문구에 동작 이름이 들어간다", async () => {
    authorizeAdminToken.mockResolvedValue({ status: "unauthorized" });
    await expect(requireAdminToken("t", "cache revalidation")).rejects.toThrow(
      "Unauthorized cache revalidation",
    );

    authorizeAdminToken.mockResolvedValue({ status: "throttled", retryAfterSeconds: 1 });
    await expect(requireAdminToken("t", "article preview")).rejects.toThrow(
      "Too many failed article preview attempts",
    );
  });

  it("우회를 연 표면만 테스트 세션에서 스로틀을 건너뛴다", async () => {
    isTestAdminSessionEnabled.mockReturnValue(true);

    await expect(
      requireAdminToken("", "article preview", { allowTestSession: true }),
    ).resolves.toBeUndefined();
    expect(authorizeAdminToken).not.toHaveBeenCalled();
  });
});
