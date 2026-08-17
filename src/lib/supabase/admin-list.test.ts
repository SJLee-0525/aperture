import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  rows: vi.fn(),
}));

/** supabase-js 쿼리 빌더 대역 — `listProjected` 가 쓰는 select·order 체인만 재현한다. */
const builder = () => {
  const chain = {
    select: (select: string) => {
      mocks.select(select);
      return chain;
    },
    order: () => chain,
    then: (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ): Promise<unknown> =>
      Promise.resolve({ data: mocks.rows(), error: null }).then(resolve, reject),
  };
  return chain;
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ from: () => builder() }),
}));
vi.mock("@/lib/supabase/admin/require-admin-session", () => ({
  requireAdminSession: async () => undefined,
}));

import { listDevArticleItemsAdmin } from "@/lib/supabase/admin-list";

describe("listDevArticleItemsAdmin — 목록 projection", () => {
  beforeEach(() => {
    mocks.select.mockClear();
    mocks.rows.mockReset();
  });

  it("본문을 빼고 고정 여부를 함께 읽는다", async () => {
    mocks.rows.mockReturnValue([]);

    await listDevArticleItemsAdmin();

    const select = String(mocks.select.mock.calls[0]?.[0]);
    expect(select).toContain("pinned");
    // 목록 행은 수십 KB 짜리 본문을 읽지 않는다.
    expect(select).not.toContain("body");
  });

  it("행의 고정 값을 그대로 디코딩한다", async () => {
    mocks.rows.mockReturnValue([
      {
        id: "a1",
        published: true,
        pinned: true,
        slug: "serverless-portfolio",
        published_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-22T00:00:00.000Z",
        title: { ko: "제목", en: "Title" },
        tags: ["nextjs"],
      },
    ]);

    const [item] = await listDevArticleItemsAdmin();

    expect(item?.pinned).toBe(true);
  });

  it("고정 값이 없는 행은 고정하지 않은 것으로 읽는다", async () => {
    mocks.rows.mockReturnValue([
      { id: "a1", published: false, slug: "", published_at: null, updated_at: null },
    ]);

    const [item] = await listDevArticleItemsAdmin();

    expect(item?.pinned).toBe(false);
  });
});
