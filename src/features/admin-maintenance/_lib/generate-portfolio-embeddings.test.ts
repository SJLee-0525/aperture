// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accessToken: null as string | null,
}));

vi.mock("@/lib/supabase/auth", () => ({
  getAdminAccessToken: async () => mocks.accessToken,
}));

import { generatePortfolioEmbeddings } from "@/features/admin-maintenance/_lib/generate-portfolio-embeddings";

describe("generatePortfolioEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accessToken = "admin-token";
  });

  it("현재 관리자 access token을 서버 요청에 전달한다", async () => {
    const result = { count: 3, dimensions: 1536, model: "text-embedding-3-small", sections: {} };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => result });
    vi.stubGlobal("fetch", fetchMock);

    await expect(generatePortfolioEmbeddings()).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio-embeddings", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token" },
    });
  });

  it("로그인하지 않은 경우 서버를 호출하지 않는다", async () => {
    mocks.accessToken = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generatePortfolioEmbeddings()).rejects.toThrow("관리자 로그인이 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
