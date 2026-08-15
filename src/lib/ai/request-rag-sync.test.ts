// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accessToken: null as string | null,
}));

vi.mock("@/lib/supabase/auth", () => ({
  getAdminAccessToken: async () => mocks.accessToken,
}));

import { requestRagSync } from "@/lib/ai/request-rag-sync";

describe("requestRagSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accessToken = "admin-token";
  });

  it("저장된 콘텐츠 종류와 ID만 증분 API에 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await requestRagSync("musicWork", "work-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio-embeddings", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: { sourceType: "musicWork", sourceId: "work-1" } }),
    });
  });
});
