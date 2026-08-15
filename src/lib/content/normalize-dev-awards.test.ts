import { describe, expect, it } from "vitest";

import { normalizeDevAwards } from "@/lib/content/normalize-dev-awards";

describe("normalizeDevAwards", () => {
  it("구형 수상에 안정적인 ID와 새 필드 기본값을 채운다", () => {
    const awards = normalizeDevAwards([
      {
        year: "2025",
        name: { ko: "수상", en: "Award" },
        place: { ko: "우수상", en: "Excellence" },
        description: { ko: "설명", en: "Description" },
      },
    ]);

    expect(awards[0]).toMatchObject({ id: "dev-award-1", projectId: "", year: "2025" });
  });

  it("중복 ID를 결정적으로 고유하게 만든다", () => {
    const awards = normalizeDevAwards([
      { id: "award", year: "2025" },
      { id: "award", year: "2024" },
    ]);

    expect(awards.map(({ id }) => id)).toEqual(["award", "award-2"]);
  });

  it("배열이 아닌 값은 빈 목록으로 정규화한다", () => {
    expect(normalizeDevAwards(null)).toEqual([]);
  });
});
