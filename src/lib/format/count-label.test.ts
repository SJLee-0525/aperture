import { describe, expect, it } from "vitest";

import { countLabel } from "@/lib/format/count-label";

describe("countLabel", () => {
  it("1 에서는 단수형을 쓴다", () => {
    expect(countLabel(1, "photo")).toBe("1 photo");
  });

  it("0 과 2 이상에서는 복수형을 쓴다", () => {
    expect(countLabel(0, "photo")).toBe("0 photos");
    expect(countLabel(12, "photo")).toBe("12 photos");
  });

  it("복수형이 규칙과 다르면 직접 받는다", () => {
    expect(countLabel(2, "entry", "entries")).toBe("2 entries");
  });
});
