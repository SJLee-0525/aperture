import { describe, expect, it } from "vitest";

import { assertPerformanceTargets, PERFORMANCE_TARGETS } from "./performance-targets";

describe("performance targets", () => {
  it("운영 대표 경로와 안정적인 ID를 고정한다", () => {
    expect(PERFORMANCE_TARGETS).toEqual([
      { id: "dev-projects", path: "/ko/dev/projects" },
      { id: "dev-articles", path: "/ko/dev/articles" },
      { id: "dev", path: "/ko/dev" },
      { id: "dev-career", path: "/ko/dev/career" },
      { id: "photo", path: "/ko/photo" },
      { id: "photo-about", path: "/ko/photo/about" },
      { id: "photo-albums", path: "/ko/photo/albums" },
      { id: "photo-map", path: "/ko/photo/map" },
      { id: "music", path: "/ko/music" },
      { id: "music-media", path: "/ko/music/media" },
      { id: "home", path: "/ko" },
      { id: "contact", path: "/ko/contact" },
    ]);
    expect(new Set(PERFORMANCE_TARGETS.map(({ id }) => id)).size).toBe(PERFORMANCE_TARGETS.length);
  });

  it.each([
    ["짝이 어긋난 id와 path", { id: "home", path: "/ko/contact" }],
    ["알 수 없는 id", { id: "blog", path: "/ko/dev" }],
    ["알 수 없는 path", { id: "home", path: "/en" }],
  ])("%s를 거부한다", (_case, target) => {
    expect(() => assertPerformanceTargets([target])).toThrow("unsupported target");
  });

  it("id와 path가 맞는 설정은 통과한다", () => {
    expect(assertPerformanceTargets([{ id: "home", path: "/ko" }])).toEqual([
      { id: "home", path: "/ko" },
    ]);
  });
});
