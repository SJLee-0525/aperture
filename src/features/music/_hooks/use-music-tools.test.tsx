// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WebMcpExecute } from "@/lib/webmcp/model-context";
import type { MusicAward, MusicWork } from "@/types/music";

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
  useLang: () => ({ lang: "ko", dict: {}, setLang: vi.fn() }),
}));

import { useMusicAwardTools, useMusicWorkTools } from "./use-music-tools";

const workOf = (id: string, title: string, category: { ko: string; en: string }): MusicWork => ({
  id,
  title: { ko: title, en: title },
  subtitle: { ko: "Schubert · D.911", en: "Schubert · D.911" },
  // 관리 폼과 같은 로컬 자정 저장 — 어느 TZ 의 CI 에서도 로컬 날짜가 11-01 로 유지된다.
  performedAt: new Date(2025, 10, 1),
  time: "19:30",
  venue: { ko: "예술의전당", en: "Seoul Arts Center" },
  category,
  program: ["Winterreise D.911"],
  description: { ko: "", en: "" },
  poster: { url: "", path: "", w: 0, h: 0 },
  ticketUrl: "https://tickets.example.com/1",
  order: 0,
  published: true,
});

const RECITAL = { ko: "리사이틀", en: "Recital" };
const CONCERTO = { ko: "협연", en: "Concerto" };

const WORKS: MusicWork[] = [
  workOf("w1", "겨울나그네", RECITAL),
  workOf("w2", "라흐마니노프 2번", CONCERTO),
];

const AWARDS: MusicAward[] = [
  {
    id: "aw1",
    year: 2022,
    name: { ko: "국제 콩쿠르 1위", en: "International Competition 1st" },
    place: "Geneva, CH",
    description: { ko: "", en: "" },
    order: 0,
    published: true,
  },
];

const executeOf = (name: string): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.find((entry) => entry[0].name === name);
  if (!call) throw new Error(`tool not registered: ${name}`);
  return call[1];
};

describe("useMusicWorkTools", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("list_music_works 는 카테고리를 ko·en 어느 쪽으로도 필터한다", async () => {
    renderHook(() => useMusicWorkTools(WORKS));
    const execute = executeOf("list_music_works");

    const english = await execute({ category: "recital" });
    expect(english).toContain("겨울나그네");
    expect(english).not.toContain("라흐마니노프");

    const korean = await execute({ category: "협연" });
    expect(korean).toContain("라흐마니노프 2번");

    await expect(Promise.resolve(execute({ category: "opera" }))).resolves.toBe(
      'No performances match category "opera".',
    );
  });

  it("빈 카탈로그는 카테고리 인자가 있어도 게시 없음으로 답한다", async () => {
    renderHook(() => useMusicWorkTools([]));

    await expect(
      Promise.resolve(executeOf("list_music_works")({ category: "recital" })),
    ).resolves.toBe("No performances are published yet.");
  });

  it("list_music_works 는 화면과 같은 공연일 표기와 로케일 딥링크를 포함한다", async () => {
    renderHook(() => useMusicWorkTools(WORKS));

    const result = await executeOf("list_music_works")({});
    expect(result).toContain("2025.11.01");
    expect(result).toContain("/ko/music?work=w1");
  });

  it("get_music_work 는 프로그램·장소·예매 링크를 반환한다", async () => {
    renderHook(() => useMusicWorkTools(WORKS));

    const result = await executeOf("get_music_work")({ workId: "w1" });
    expect(result).toContain("겨울나그네 · Schubert · D.911");
    expect(result).toContain("2025.11.01 19:30 · 예술의전당 · 리사이틀");
    expect(result).toContain("Program: Winterreise D.911");
    expect(result).toContain("Tickets: https://tickets.example.com/1");

    await expect(Promise.resolve(executeOf("get_music_work")({ workId: "nope" }))).resolves.toBe(
      "No performance matches that id.",
    );
  });
});

describe("useMusicAwardTools", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("수상을 연도·장소·경력 페이지 경로와 함께 직렬화한다", async () => {
    renderHook(() => useMusicAwardTools(AWARDS));

    const result = await executeOf("list_music_awards")({});
    expect(result).toBe("2022 · 국제 콩쿠르 1위 · Geneva, CH · /ko/music/career?award=aw1");
  });

  it("빈 목록에 안내 문장을 반환한다", async () => {
    renderHook(() => useMusicAwardTools([]));
    await expect(Promise.resolve(executeOf("list_music_awards")({}))).resolves.toBe(
      "No awards are published yet.",
    );
  });
});
