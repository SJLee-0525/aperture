import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchDocument } from "@/types/search";

/** 모듈 프라미스 캐시를 시험하므로 매 테스트 새 모듈 인스턴스를 lazy import 한다. */
const importLoader = async () => (await import("./load-search-index")).loadSearchIndex;

const DOCUMENT: SearchDocument = {
  key: "photo-1",
  section: "photo",
  title: { ko: "사진", en: "Photo" },
  index: { title: "photo", body: "", choseong: "" },
  href: "/photo?photo=1",
};

const okResponse = () => ({
  ok: true,
  json: () => Promise.resolve([DOCUMENT]),
});

describe("loadSearchIndex", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("성공한 fetch는 모듈 캐시로 재사용된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const loadSearchIndex = await importLoader();

    await expect(loadSearchIndex()).resolves.toEqual([DOCUMENT]);
    await expect(loadSearchIndex()).resolves.toEqual([DOCUMENT]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/search-index");
  });

  it("실패하면 캐시를 비워 다음 호출에서 재시도한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const loadSearchIndex = await importLoader();

    await expect(loadSearchIndex()).rejects.toThrow("search-index 500");
    await expect(loadSearchIndex()).resolves.toEqual([DOCUMENT]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
