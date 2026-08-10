// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AlbumCard } from "@/features/albums/_lib/album-cards";
import type { WebMcpExecute } from "@/lib/webmcp/model-context";

const adapter = vi.hoisted(() => ({
  registerWebMcpTool: vi.fn<
    (
      definition: import("@/lib/webmcp/model-context").WebMcpToolDefinition,
      execute: import("@/lib/webmcp/model-context").WebMcpExecute,
      signal: AbortSignal,
    ) => boolean
  >(() => true),
}));

vi.mock("@/lib/webmcp/model-context", () => ({
  registerWebMcpTool: adapter.registerWebMcpTool,
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "en", dict: {}, setLang: vi.fn() }),
}));

import { useAlbumTools } from "./use-album-tools";

const albumOf = (id: string, title: string, count: number): AlbumCard => ({
  id,
  title: { ko: title, en: title },
  subtitle: { ko: "부제", en: "Subtitle" },
  coverUrl: null,
  count,
});

const lastExecute = (): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.at(-1);
  if (!call) throw new Error("no tool registered");
  return call[1];
};

describe("useAlbumTools", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("앨범 목록을 로케일 경로와 함께 직렬화한다", async () => {
    renderHook(() => useAlbumTools([albumOf("a1", "Tokyo", 12)]));

    const result = await lastExecute()({});
    expect(result).toBe("Tokyo · Subtitle · 12 photos · /en/photo/albums/a1");
  });

  it("limit 로 자르고 남은 건수를 +N more 로 알린다", async () => {
    const albums = Array.from({ length: 5 }, (_, index) =>
      albumOf(`a${index}`, `Album ${index}`, 1),
    );
    renderHook(() => useAlbumTools(albums));

    const result = await lastExecute()({ limit: 2 });
    expect(result).toContain("Album 0");
    expect(result).toContain("Album 1");
    expect(result).toContain("+3 more");
  });

  it("빈 목록에 다음 행동이 보이는 문장을 반환한다", async () => {
    renderHook(() => useAlbumTools([]));
    await expect(Promise.resolve(lastExecute()({}))).resolves.toBe("No albums are published yet.");
  });
});
