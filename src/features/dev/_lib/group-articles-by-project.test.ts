import { describe, expect, it } from "vitest";

import { groupArticlesByProject } from "@/features/dev/_lib/group-articles-by-project";

import type { DevArticleProjectLink } from "@/types/dev-article";

const link = (
  id: string,
  relatedProjectIds: string[],
  publishedAt = "2026-05-18T00:00:00+09:00",
): DevArticleProjectLink => ({
  id,
  slug: id,
  title: { ko: id, en: id },
  publishedAt: new Date(publishedAt),
  relatedProjectIds,
});

describe("groupArticlesByProject", () => {
  it("글의 관계를 프로젝트별 목록으로 뒤집는다", () => {
    const grouped = groupArticlesByProject([
      link("recent", ["portfolio", "photo-portfolio"], "2026-05-20T00:00:00+09:00"),
      link("older", ["portfolio"], "2026-05-10T00:00:00+09:00"),
    ]);

    expect(grouped.portfolio?.map((article) => article.id)).toEqual(["recent", "older"]);
    expect(grouped["photo-portfolio"]?.map((article) => article.id)).toEqual(["recent"]);
  });

  it("아무 글도 지목하지 않은 프로젝트는 키가 없다", () => {
    expect(groupArticlesByProject([link("solo", ["portfolio"])])).not.toHaveProperty(
      "design-system",
    );
  });

  it("같은 프로젝트를 두 번 지목해도 한 번만 담는다", () => {
    const grouped = groupArticlesByProject([link("dup", ["portfolio", "portfolio"])]);

    expect(grouped.portfolio).toHaveLength(1);
  });

  it("프로토타입에 있는 이름을 프로젝트 id 로 써도 그 글만 담는다", () => {
    const grouped = groupArticlesByProject([
      link("proto", ["__proto__"]),
      link("ctor", ["constructor"]),
    ]);

    // 점 접근은 프로토타입 속성 타입으로 해석돼 색인 시그니처를 거치지 않는다.
    const protoKey = "__proto__";
    const constructorKey = "constructor";
    expect(grouped[protoKey]?.map((article) => article.id)).toEqual(["proto"]);
    expect(grouped[constructorKey]?.map((article) => article.id)).toEqual(["ctor"]);
  });

  it("관계가 없는 글만 있으면 빈 결과다", () => {
    expect(groupArticlesByProject([link("none", [])])).toEqual({});
  });
});
