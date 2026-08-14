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

import { getPortfolioEmbeddingStatus } from "@/features/admin-maintenance/_lib/get-portfolio-embedding-status";

describe("getPortfolioEmbeddingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { getIdToken: vi.fn().mockResolvedValue("admin-token") };
  });

  it("관리자 token으로 캐시하지 않는 상태 요청을 보낸다", async () => {
    const status = {
      completed: 3,
      model: "text-embedding-3-small",
      outdated: 1,
      pending: 2,
      percent: 50,
      stale: 0,
      total: 6,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => status });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPortfolioEmbeddingStatus()).resolves.toEqual(status);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio-embeddings", {
      headers: { Authorization: "Bearer admin-token" },
      cache: "no-store",
    });
  });

  it("로그인하지 않은 경우 요청하지 않는다", async () => {
    mocks.currentUser = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPortfolioEmbeddingStatus()).rejects.toThrow("관리자 로그인이 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("서버 오류 메시지를 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "준비 중" }) }),
    );

    await expect(getPortfolioEmbeddingStatus()).rejects.toThrow("준비 중");
  });

  it("응답 본문을 읽을 수 없으면 상태 코드가 포함된 오류를 만든다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError("invalid json");
        },
      }),
    );

    await expect(getPortfolioEmbeddingStatus()).rejects.toThrow("임베딩 상태 확인 실패 (502)");
  });
});
