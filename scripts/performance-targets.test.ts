import { describe, expect, it } from "vitest";

import { PERFORMANCE_TARGETS } from "./performance-targets";

describe("performance targets", () => {
  it("운영 대표 경로와 안정적인 ID를 고정한다", () => {
    expect(PERFORMANCE_TARGETS).toEqual([
      { id: "home", path: "/ko" },
      { id: "photo", path: "/ko/photo" },
      { id: "music", path: "/ko/music" },
      { id: "dev", path: "/ko/dev" },
    ]);
    expect(new Set(PERFORMANCE_TARGETS.map(({ id }) => id)).size).toBe(PERFORMANCE_TARGETS.length);
  });
});
