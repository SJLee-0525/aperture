// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WebMcpExecute } from "@/lib/webmcp/model-context";
import type { SearchDocument } from "@/types/search";

const adapter = vi.hoisted(() => ({
  registerWebMcpTool: vi.fn<
    (
      definition: import("@/lib/webmcp/model-context").WebMcpToolDefinition,
      execute: import("@/lib/webmcp/model-context").WebMcpExecute,
      signal: AbortSignal,
    ) => boolean
  >(() => true),
}));

const search = vi.hoisted(() => ({
  loadSearchIndex: vi.fn<() => Promise<SearchDocument[]>>(),
}));

vi.mock("@/lib/webmcp/model-context", () => ({
  registerWebMcpTool: adapter.registerWebMcpTool,
}));

vi.mock("@/lib/search/load-search-index", () => ({
  loadSearchIndex: search.loadSearchIndex,
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: {}, setLang: vi.fn() }),
}));

import { useGlobalTools, type WebMcpProfile } from "./use-global-tools";

const PROFILE: WebMcpProfile = {
  name: { ko: "이성준", en: "Sungjoon Lee" },
  tagline: { ko: "사진가 · 피아니스트 · 개발자", en: "Photographer · Pianist · Developer" },
  bio: { ko: "소개", en: "Bio" },
};

/** 인덱스 문서 — index.body 토큰이 채점기의 실제 대조 대상. */
const documentOf = (
  key: string,
  section: SearchDocument["section"],
  title: string,
  href: string,
): SearchDocument => ({
  key,
  section,
  title: { ko: title, en: title },
  index: { title: title.toLowerCase(), body: title.toLowerCase(), choseong: "" },
  href,
});

const DOCUMENTS: SearchDocument[] = [
  documentOf("proj-1", "dev", "Recipedia", "/dev/projects?project=1"),
  documentOf("photo-1", "photo", "Seoul", "/photo?photo=1"),
  documentOf("work-1", "music", "Recital", "/music?work=1"),
];

/** 등록된 도구의 execute 를 이름으로 찾는다. */
const executeOf = (name: string): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.find(
    (entry) => (entry[0] as { name: string }).name === name,
  );
  if (!call) throw new Error(`tool not registered: ${name}`);
  return call[1] as WebMcpExecute;
};

describe("useGlobalTools", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("전역 도구 2종을 읽기 전용으로 등록한다", () => {
    renderHook(() => useGlobalTools(PROFILE));

    const names = adapter.registerWebMcpTool.mock.calls.map(
      (call) => (call[0] as { name: string }).name,
    );
    expect(names).toEqual(["search_portfolio", "get_profile"]);
    for (const call of adapter.registerWebMcpTool.mock.calls) {
      expect((call[0] as { annotations: { readOnlyHint: boolean } }).annotations.readOnlyHint).toBe(
        true,
      );
    }
  });

  it("search_portfolio 는 로케일 프리픽스 경로로 결과를 반환한다", async () => {
    search.loadSearchIndex.mockResolvedValue(DOCUMENTS);
    renderHook(() => useGlobalTools(PROFILE));

    const result = await executeOf("search_portfolio")({ query: "recipedia" });
    expect(result).toBe("Recipedia · dev · /ko/dev/projects?project=1");
  });

  it("section 인자로 결과를 제한한다", async () => {
    search.loadSearchIndex.mockResolvedValue([
      documentOf("photo-1", "photo", "Seoul", "/photo?photo=1"),
      documentOf("proj-2", "dev", "Seoul Metro App", "/dev/projects?project=2"),
    ]);
    renderHook(() => useGlobalTools(PROFILE));

    const result = await executeOf("search_portfolio")({ query: "seoul", section: "photo" });
    expect(result).toContain("photo");
    expect(result).not.toContain("dev");
  });

  it("빈 질의·무결과·인덱스 실패에 다음 행동이 보이는 문장을 반환한다", async () => {
    search.loadSearchIndex.mockResolvedValue(DOCUMENTS);
    renderHook(() => useGlobalTools(PROFILE));
    const execute = executeOf("search_portfolio");

    await expect(Promise.resolve(execute({}))).resolves.toBe("Provide a query string to search.");
    await expect(Promise.resolve(execute({ query: "zzzz" }))).resolves.toBe(
      'No results for "zzzz".',
    );

    search.loadSearchIndex.mockRejectedValue(new Error("offline"));
    await expect(Promise.resolve(execute({ query: "seoul" }))).resolves.toBe(
      "Search index is unavailable right now. Try again later.",
    );
  });

  it("get_profile 은 현재 언어 텍스트와 섹션 진입 경로를 반환한다", async () => {
    renderHook(() => useGlobalTools(PROFILE));

    const full = await executeOf("get_profile")({});
    expect(full).toContain("이성준 — 사진가 · 피아니스트 · 개발자");
    expect(full).toContain("photo: /ko/photo");
    expect(full).toContain("music: /ko/music");
    expect(full).toContain("dev: /ko/dev/projects");
    // 다른 페이지에서 "연락하고 싶어" 라고 해도 경로를 알 수 있어야 한다.
    expect(full).toContain("contact: /ko/contact");

    const scoped = await executeOf("get_profile")({ section: "music" });
    expect(scoped).toContain("music: /ko/music");
    expect(scoped).not.toContain("photo: /ko/photo");
    // 연락 경로는 섹션 필터와 무관하게 항상 붙는다.
    expect(scoped).toContain("contact: /ko/contact");
  });
});
