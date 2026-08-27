import { describe, expect, it } from "vitest";

import { readSearchQuery } from "@/features/search/_lib/read-search-query";

describe("readSearchQuery", () => {
  it("값이 없으면 빈 문자열이다", () => {
    expect(readSearchQuery(undefined)).toBe("");
  });

  it("앞뒤 공백을 지운다", () => {
    expect(readSearchQuery("  seoul  ")).toBe("seoul");
  });

  it("여러 번 넘어오면 첫 값만 쓴다", () => {
    expect(readSearchQuery(["a", "b"])).toBe("a");
  });

  it("빈 배열도 빈 문자열이다", () => {
    expect(readSearchQuery([])).toBe("");
  });
});
