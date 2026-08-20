import { beforeEach, describe, expect, it, vi } from "vitest";

type SavedRow = { data: { ticketUrl: string } };

const mocks = vi.hoisted(() => ({
  insert: vi.fn<(row: unknown) => unknown>(() => ({ data: [{ id: "w1" }], error: null })),
  updateSelect: vi.fn<(row: unknown) => unknown>(() => ({ data: [{ id: "w1" }], error: null })),
  maybeSingle: vi.fn(() => ({ data: null, error: null })),
  listResult: vi.fn(() => ({ data: [], error: null })),
}));

/** supabase-js 쿼리 빌더 대역 — 이 파일이 쓰는 체인만 재현한다. */
const builder = () => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    maybeSingle: () => Promise.resolve(mocks.maybeSingle()),
    insert: (row: unknown) => Promise.resolve(mocks.insert(row)),
    update: (row: unknown) => ({
      eq: () => ({ select: () => Promise.resolve(mocks.updateSelect(row)) }),
    }),
    then: (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ): Promise<unknown> => Promise.resolve(mocks.listResult()).then(resolve, reject),
  };
  return chain;
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ from: () => builder() }),
}));
vi.mock("@/lib/supabase/admin/require-admin-session", () => ({
  requireAdminSession: async () => undefined,
}));
vi.mock("@/lib/ai/request-rag-sync", () => ({ requestRagSync: vi.fn() }));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicRevalidate: vi.fn(),
  requestPublicPathRevalidate: vi.fn(),
}));

import { musicWorks } from "@/lib/supabase/music";

import type { MusicWorkInput } from "@/lib/supabase/music";

const workInput = (ticketUrl: string): MusicWorkInput => ({
  title: { ko: "제목", en: "Title" },
  subtitle: { ko: "", en: "" },
  performedAt: new Date("2026-05-01T00:00:00.000Z"),
  time: "19:30",
  venue: { ko: "홀", en: "Hall" },
  category: { ko: "리사이틀", en: "Recital" },
  program: [],
  description: { ko: "", en: "" },
  poster: { url: "", path: "", w: 0, h: 0 },
  ticketUrl,
  order: 0,
  published: true,
});

describe("musicWorks 저장 경계", () => {
  beforeEach(() => vi.clearAllMocks());

  it("실행 가능한 주소는 저장하지 않는다", async () => {
    await expect(musicWorks.create("w1", workInput("javascript:alert(1)"))).rejects.toThrow(
      "사용할 수 없는 주소",
    );
    await expect(musicWorks.update("w1", workInput("javascript:alert(1)"))).rejects.toThrow(
      "사용할 수 없는 주소",
    );
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.updateSelect).not.toHaveBeenCalled();
  });

  it("http 주소는 그대로 저장한다", async () => {
    // 폼은 https 만 받지만, 폼을 거치지 않는 재저장(이미지 마이그레이션)이 기존 값을
    // 지우면 안 된다. 표시 단계에서 거르는 것과 저장 단계에서 막는 것은 기준이 다르다.
    await musicWorks.update("w1", workInput("http://example.com/ticket"));

    const saved = mocks.updateSelect.mock.lastCall?.[0] as SavedRow | undefined;
    expect(saved?.data.ticketUrl).toBe("http://example.com/ticket");
  });

  it("빈 예매 링크는 정상 저장한다", async () => {
    await expect(musicWorks.update("w1", workInput(""))).resolves.toBeUndefined();
  });
});
