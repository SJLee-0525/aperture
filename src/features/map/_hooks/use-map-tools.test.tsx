// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MapLocation } from "@/features/map/_types/map-location";
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

import { useMapTools } from "./use-map-tools";

const locationOf = (id: string, place: string): MapLocation => ({
  id,
  coords: { lat: 37.5, lng: 127.0 },
  place: { ko: place, en: place },
  thumbnailUrl: "",
});

const lastExecute = (): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.at(-1);
  if (!call) throw new Error("no tool registered");
  return call[1];
};

describe("useMapTools", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("촬영 위치를 좌표·지도 딥링크와 함께 직렬화한다", async () => {
    renderHook(() => useMapTools([locationOf("p1", "Seoul")]));

    const result = await lastExecute()({});
    expect(result).toBe("Seoul (37.5, 127) · /en/photo/map?photo=p1");
  });

  it("빈 목록에 안내 문장을 반환한다", async () => {
    renderHook(() => useMapTools([]));
    await expect(Promise.resolve(lastExecute()({}))).resolves.toBe(
      "No photo locations are published yet.",
    );
  });
});
