// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MapLocation } from "@/features/map/_lib/map-location";
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

  it("같은 장소를 묶어 촬영이 많은 순으로 돌려준다", async () => {
    renderHook(() =>
      useMapTools([
        locationOf("p1", "Seoul"),
        locationOf("p2", "Busan"),
        locationOf("p3", "Busan"),
      ]),
    );

    const result = await lastExecute()({});
    // 단수에 "1 photos" 가 나가면 답변 문장에 그대로 실린다.
    // 사진마다 한 줄씩 나열하면 같은 장소가 반복돼 "어디서 많이 찍었나" 에 답할 수 없다.
    expect(result).toBe(
      "Busan — 2 photos (37.5, 127) · /en/photo/map?photo=p2\n" +
        "Seoul — 1 photo (37.5, 127) · /en/photo/map?photo=p1",
    );
  });

  it("장소명이 빈 사진은 이름 없는 한 그룹으로 뭉치지 않는다", async () => {
    renderHook(() =>
      useMapTools([
        locationOf("p1", "Seoul"),
        { ...locationOf("p2", ""), coords: { lat: 1, lng: 1 } },
        { ...locationOf("p3", ""), coords: { lat: 2, lng: 2 } },
      ]),
    );

    // 좌표는 EXIF 자동, 장소명은 관리자 입력이라 빈 값이 정상적으로 생긴다.
    const result = await lastExecute()({});
    expect(result).toBe("Seoul — 1 photo (37.5, 127) · /en/photo/map?photo=p1");
  });

  it("장소명이 하나도 없으면 그 사실을 알린다", async () => {
    renderHook(() => useMapTools([locationOf("p1", "")]));

    await expect(Promise.resolve(lastExecute()({}))).resolves.toBe(
      "No photo locations have a place name yet.",
    );
  });

  it("빈 목록에 안내 문장을 반환한다", async () => {
    renderHook(() => useMapTools([]));
    await expect(Promise.resolve(lastExecute()({}))).resolves.toBe(
      "No photo locations are published yet.",
    );
  });
});
