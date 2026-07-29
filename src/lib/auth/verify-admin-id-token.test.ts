import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";

const response = (body: unknown, ok = true): Response =>
  ({ ok, json: async () => body }) as Response;

describe("verifyAdminIdToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Firebase가 검증한 UID가 관리자와 일치할 때만 허용한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "web-key");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_UID", "admin-uid");
    const fetcher = vi.fn(async () => response({ users: [{ localId: "admin-uid" }] }));

    await expect(verifyAdminIdToken("valid-token", fetcher)).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=web-key",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "valid-token" }),
        cache: "no-store",
      }),
    );
  });

  it("다른 UID와 Firebase 검증 실패를 거부한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "web-key");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_UID", "admin-uid");

    await expect(
      verifyAdminIdToken(
        "other-token",
        vi.fn(async () => response({ users: [{ localId: "other-uid" }] })),
      ),
    ).resolves.toBe(false);
    await expect(
      verifyAdminIdToken(
        "invalid-token",
        vi.fn(async () => response({}, false)),
      ),
    ).resolves.toBe(false);
  });

  it("토큰이나 서버 설정이 없으면 외부 요청 없이 거부한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_UID", "");
    const fetcher = vi.fn();

    await expect(verifyAdminIdToken("", fetcher)).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
