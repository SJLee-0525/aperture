import { describe, expect, it } from "vitest";

import { PERFORMANCE_TARGETS } from "./performance-targets";

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
});
