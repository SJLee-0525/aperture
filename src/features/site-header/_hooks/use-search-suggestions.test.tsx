// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeForSearch } from "@/lib/text/korean-tokenize";
import type { SearchDocument } from "@/types/search";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko" }),
}));

const doc = (key: string, titleKo: string): SearchDocument => ({
  key,
  section: "photo",
  title: { ko: titleKo, en: "" },
  index: { title: normalizeForSearch(titleKo), body: "", choseong: "" },
  href: `/x/${key}`,
});

const documents = [doc("photo-dawn", "부산의 새벽"), doc("photo-sea", "겨울 바다")];

const fetchMock = vi.fn();

/**
 * 모듈 캐시(searchIndexPromise)가 테스트 간 새어들지 않게 매번 새 모듈로 훅을 얻는다.
 *
 * @returns {Promise<(query: string) => { suggestions: SearchSuggestion[]; loadIndex: () => void }>}
 */
const freshHook = async () => {
  vi.resetModules();
  const { useSearchSuggestions } =
    await import("@/features/site-header/_hooks/use-search-suggestions");
  return useSearchSuggestions;
};

describe("useSearchSuggestions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(documents) });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loadIndex 를 여러 번 불러도 인덱스는 1회만 fetch 한다", async () => {
    const useSearchSuggestions = await freshHook();
    const { result } = renderHook(() => useSearchSuggestions("부산"));

    act(() => {
      result.current.loadIndex();
      result.current.loadIndex();
    });
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));

    act(() => result.current.loadIndex());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions[0]!.key).toBe("photo-dawn");
  });

  it("입력 변경은 디바운스 후 반영되고, 비우면 즉시 사라진다", async () => {
    const useSearchSuggestions = await freshHook();
    const { result, rerender } = renderHook(({ q }) => useSearchSuggestions(q), {
      initialProps: { q: "부산" },
    });
    act(() => result.current.loadIndex());
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));

    // 디바운스 창 안에서는 직전 질의 추천이 유지된다.
    rerender({ q: "겨울" });
    expect(result.current.suggestions[0]!.key).toBe("photo-dawn");
    await waitFor(() => expect(result.current.suggestions[0]!.key).toBe("photo-sea"));

    // 빈 입력은 디바운스를 기다리지 않고 즉시 반영된다.
    rerender({ q: "" });
    expect(result.current.suggestions).toHaveLength(0);
  });

  it("fetch 실패 시 추천만 비활성되고 다음 loadIndex 에서 재시도한다", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    const useSearchSuggestions = await freshHook();
    const { result } = renderHook(() => useSearchSuggestions("부산"));

    act(() => result.current.loadIndex());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current.suggestions).toHaveLength(0);

    act(() => result.current.loadIndex());
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
