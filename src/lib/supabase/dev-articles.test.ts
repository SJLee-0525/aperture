import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  requestPublicRevalidate: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    rpc: (...args: unknown[]) => Promise.resolve(mocks.rpc(...args)),
  }),
}));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicRevalidate: mocks.requestPublicRevalidate,
}));

import { MAX_PINNED_ARTICLES, PIN_LIMIT_MESSAGE } from "@/constants/dev-article-pin";
import { setDevArticlePinned } from "@/lib/supabase/dev-articles";

beforeEach(() => {
  mocks.rpc.mockReset().mockReturnValue({ data: true, error: null });
  mocks.requestPublicRevalidate.mockReset();
});

describe("setDevArticlePinned", () => {
  // 상한 검사와 갱신을 나누면 두 클라이언트가 같은 개수를 읽고 각자 고정해 상한을 넘긴다.
  it("상한을 인자로 넘겨 RPC 한 번으로 처리한다", async () => {
    await setDevArticlePinned("a1", true);

    expect(mocks.rpc).toHaveBeenCalledWith("set_dev_article_pinned", {
      p_id: "a1",
      p_pinned: true,
      p_max: MAX_PINNED_ARTICLES,
    });
  });

  it("성공하면 컬렉션 캐시를 무효화한다", async () => {
    await setDevArticlePinned("a1", true);

    expect(mocks.requestPublicRevalidate).toHaveBeenCalledTimes(1);
  });

  it("상한 위반은 개수를 담은 문구로 바꾼다", async () => {
    mocks.rpc.mockReturnValue({ data: null, error: { code: "23514", message: "..." } });

    await expect(setDevArticlePinned("a1", true)).rejects.toThrow(PIN_LIMIT_MESSAGE);
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
  });

  // RLS 가 행을 감추거나 문서가 없으면 RPC 가 오류 없이 false 를 준다.
  it("false 응답을 실패로 본다", async () => {
    mocks.rpc.mockReturnValue({ data: false, error: null });

    await expect(setDevArticlePinned("a1", true)).rejects.toThrow("고정 상태 변경에 실패했습니다.");
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
  });

  it("다른 오류도 실패로 본다", async () => {
    mocks.rpc.mockReturnValue({ data: null, error: { code: "42883", message: "..." } });

    await expect(setDevArticlePinned("a1", true)).rejects.toThrow("고정 상태 변경에 실패했습니다.");
  });
});
