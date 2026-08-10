// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WebMcpExecute } from "@/lib/webmcp/model-context";
import type { DevProjectCardData } from "@/types/dev";

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

import { useDevTools } from "./use-dev-tools";

const projectOf = (
  id: string,
  title: string,
  year: string,
  techTags: string[],
): DevProjectCardData => ({
  id,
  title: { ko: title, en: title },
  category: { ko: "웹", en: "Web" },
  year,
  summary: { ko: `${title} 요약`, en: `${title} summary` },
  cover: null,
  techTags,
});

const PROJECTS: DevProjectCardData[] = [
  projectOf("recipedia", "Recipedia", "2024", ["React", "TypeScript"]),
  projectOf("myhero", "MyHero", "2023", ["Vue", "Pinia"]),
  projectOf("mailat", "MailAt", "2024", ["React", "Next.js"]),
];

const executeOf = (name: string): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.find((entry) => entry[0].name === name);
  if (!call) throw new Error(`tool not registered: ${name}`);
  return call[1];
};

describe("useDevTools", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("list_projects 는 tech 태그를 대소문자 무시로 정확 매칭한다", async () => {
    renderHook(() => useDevTools(PROJECTS, vi.fn()));

    const result = await executeOf("list_projects")({ tech: "react" });
    expect(result).toContain("Recipedia");
    expect(result).toContain("MailAt");
    expect(result).not.toContain("MyHero");
    expect(result).toContain("/ko/dev/projects?project=recipedia");
  });

  it("list_projects 는 미지의 tech 에 알려진 태그 목록을, year 로 추가 필터를 지원한다", async () => {
    renderHook(() => useDevTools(PROJECTS, vi.fn()));
    const execute = executeOf("list_projects");

    await expect(Promise.resolve(execute({ tech: "Svelte" }))).resolves.toContain(
      "Known tech tags: React, TypeScript, Vue, Pinia, Next.js",
    );

    const filtered = await execute({ tech: "React", year: 2023 });
    expect(filtered).toBe("No projects match.");
  });

  it("get_project 는 요약·기술·로케일 딥링크를 반환한다", async () => {
    renderHook(() => useDevTools(PROJECTS, vi.fn()));

    const result = await executeOf("get_project")({ projectId: "myhero" });
    expect(result).toContain("MyHero (2023) · 웹");
    expect(result).toContain("MyHero 요약");
    expect(result).toContain("Tech: Vue, Pinia");
    expect(result).toContain("/ko/dev/projects?project=myhero");

    await expect(Promise.resolve(executeOf("get_project")({ projectId: "nope" }))).resolves.toBe(
      "No project matches that id.",
    );
  });

  it("open_project 는 뷰의 select 를 호출한다 — 화면 클릭과 같은 경로", async () => {
    const select = vi.fn();
    renderHook(() => useDevTools(PROJECTS, select));

    const result = await executeOf("open_project")({ projectId: "recipedia" });
    expect(select).toHaveBeenCalledWith("recipedia");
    expect(result).toBe('Opened project "Recipedia".');

    await expect(Promise.resolve(executeOf("open_project")({ projectId: "nope" }))).resolves.toBe(
      "No project matches that id.",
    );
    expect(select).toHaveBeenCalledTimes(1);
  });
});
