import { describe, expect, it } from "vitest";

import { compareByPublishedAtDesc } from "@/lib/content/article-order";

const article = (id: string, publishedAt: string | null) => ({
  id,
  publishedAt: publishedAt ? new Date(publishedAt) : null,
});

describe("compareByPublishedAtDesc", () => {
  it("발행일 내림차순으로 정렬한다", () => {
    const sorted = [article("a", "2026-01-01"), article("b", "2026-05-01")].sort(
      compareByPublishedAtDesc,
    );

    expect(sorted.map(({ id }) => id)).toEqual(["b", "a"]);
  });

  it("같은 발행일에는 id 오름차순으로 정렬한다", () => {
    const sorted = [article("b", "2026-01-01"), article("a", "2026-01-01")].sort(
      compareByPublishedAtDesc,
    );

    expect(sorted.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("발행일이 없는 글은 뒤로 보내고 그들끼리는 id 순으로 둔다", () => {
    const sorted = [article("c", null), article("a", null), article("b", "2026-01-01")].sort(
      compareByPublishedAtDesc,
    );

    expect(sorted.map(({ id }) => id)).toEqual(["b", "a", "c"]);
  });
});
