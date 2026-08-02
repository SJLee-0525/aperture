import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  verifyAdminIdToken: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
  updateTag: mocks.updateTag,
}));
vi.mock("@/lib/auth/verify-admin-id-token", () => ({
  verifyAdminIdToken: mocks.verifyAdminIdToken,
}));

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { revalidatePublicPages } from "@/lib/cache/revalidate-public";

describe("revalidatePublicPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAdminIdToken.mockResolvedValue(true);
  });

  it("변경된 Firestore 태그만 중복 제거해 무효화한다", async () => {
    await revalidatePublicPages("token", [
      "firestore:photos",
      "firestore:photos",
      "firestore:albums",
    ]);

    expect(mocks.updateTag.mock.calls).toEqual([["firestore:photos"], ["firestore:albums"]]);
    expect(mocks.revalidateTag).toHaveBeenCalledOnce();
    expect(mocks.revalidateTag).toHaveBeenCalledWith(CHAT_PROFILE_CACHE_TAG, "max");
  });

  it("관리자 인증 실패 시 캐시를 무효화하지 않는다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(false);

    await expect(revalidatePublicPages("invalid", ["firestore:photos"])).rejects.toThrow(
      "Unauthorized cache revalidation",
    );
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
