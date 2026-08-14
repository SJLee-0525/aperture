// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: null as { getIdToken: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({
    get currentUser() {
      return mocks.currentUser;
    },
  }),
}));

import { generatePortfolioEmbeddings } from "@/features/admin-maintenance/_lib/generate-portfolio-embeddings";

describe("generatePortfolioEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { getIdToken: vi.fn().mockResolvedValue("admin-token") };
  });

  it("현재 관리자 ID token을 서버 요청에 전달한다", async () => {
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
    mocks.currentUser = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generatePortfolioEmbeddings()).rejects.toThrow("관리자 로그인이 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
