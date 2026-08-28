import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  verifyAdminIdToken: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
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

  it("변경된 태그만 중복 제거해 무효화한다", async () => {
    await revalidatePublicPages("token", ["db:photos", "db:photos", "db:albums"]);

    expect(mocks.updateTag.mock.calls).toEqual([
      ["db:photos"],
      ["db:albums"],
      // 챗 프로필도 즉시 만료다. stale 표시로 두면 방금 비공개로 바꾼 항목이
      // 다음 질문의 답변에 그대로 실린다.
      [CHAT_PROFILE_CACHE_TAG],
    ]);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("리터럴 공개 경로의 라우트 캐시를 함께 지운다", async () => {
    await revalidatePublicPages(
      "token",
      [],
      ["/ko/dev/articles/dd", "/ko/dev/articles/dd", "/en/dev/articles/dd"],
    );

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/ko/dev/articles/dd"],
      ["/en/dev/articles/dd"],
    ]);
  });

  it("경로 형태가 아닌 값과 동적 라우트 패턴은 버린다", async () => {
    await revalidatePublicPages(
      "token",
      [],
      ["https://evil.example/x", "/dev/articles/[slug]", "ko/dev/articles/dd"],
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("프로토콜 상대 URL 은 경로로 받지 않는다", async () => {
    await revalidatePublicPages("token", [], ["//evil.example/x", "///evil.example/x"]);

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("루트 경로는 그대로 허용한다", async () => {
    await revalidatePublicPages("token", [], ["/"]);

    expect(mocks.revalidatePath.mock.calls).toEqual([["/"]]);
  });

  it("관리자 인증 실패 시 캐시를 무효화하지 않는다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(false);

    await expect(
      revalidatePublicPages("invalid", ["supabase:photos"], ["/ko/dev/articles/dd"]),
    ).rejects.toThrow("Unauthorized cache revalidation");
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
