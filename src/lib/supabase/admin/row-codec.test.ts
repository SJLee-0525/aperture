import { describe, expect, it } from "vitest";

import { encodeArticleRow, encodeListRow } from "@/lib/supabase/admin/row-codec";
import { mergeRow } from "@/lib/supabase/public/transport";

describe("row-codec — 목록 컬렉션", () => {
  it("order·published 를 스칼라로 분리하고 data 에 남기지 않는다", () => {
    const row = encodeListRow("p1", {
      order: 7,
      published: true,
      title: { ko: "제목", en: "Title" },
    });

    expect(row).toEqual({
      id: "p1",
      published: true,
      sort_order: 7,
      data: { title: { ko: "제목", en: "Title" } },
    });
    expect("order" in row.data).toBe(false);
    expect("published" in row.data).toBe(false);
  });

  it("data 안의 Date 는 ISO 문자열이 되고 undefined 키는 떨어진다", () => {
    const row = encodeListRow("p1", {
      order: 0,
      published: false,
      shotAt: new Date("2026-03-01T09:00:00.000Z"),
      fileName: undefined,
      coords: null,
    });

    expect(row.data.shotAt).toBe("2026-03-01T09:00:00.000Z");
    expect("fileName" in row.data).toBe(false);
    expect(row.data.coords).toBeNull();
  });

  it("입력 객체를 변경하지 않는다", () => {
    const input = { order: 3, published: true, image: { url: "u", path: "p" } };
    const snapshot = JSON.parse(JSON.stringify(input));

    encodeListRow("p1", input);

    expect(input).toEqual(snapshot);
  });

  it("인코딩 결과를 읽기 병합에 통과시키면 원래 문서 모양으로 돌아온다", () => {
    const input = {
      order: 5,
      published: true,
      title: { ko: "왕복", en: "Round trip" },
      tags: ["a", "b"],
    };
    const row = encodeListRow("p1", input);

    const merged = mergeRow("photos", row as unknown as Record<string, unknown>);

    expect(merged.id).toBe("p1");
    expect(merged.data.order).toBe(5);
    expect(merged.data.published).toBe(true);
    expect(merged.data.title).toEqual(input.title);
    expect(merged.data.tags).toEqual(input.tags);
  });
});

describe("row-codec — dev_articles", () => {
  it("slug·publishedAt 은 스칼라로, firstPublishedAt 은 data 에 남긴다", () => {
    const row = encodeArticleRow("a1", {
      published: true,
      slug: "chunking",
      publishedAt: new Date("2026-08-01T00:00:00.000Z"),
      firstPublishedAt: new Date("2026-07-01T00:00:00.000Z"),
      body: "# 본문",
    });

    expect(row.published).toBe(true);
    expect(row.slug).toBe("chunking");
    expect(row.published_at).toBe("2026-08-01T00:00:00.000Z");
    expect(row.data.firstPublishedAt).toBe("2026-07-01T00:00:00.000Z");
    expect("slug" in row.data).toBe(false);
    expect("publishedAt" in row.data).toBe(false);
  });

  it("초안의 publishedAt null 을 보존하고 DB 소유 타임스탬프는 쓰지 않는다", () => {
    const row = encodeArticleRow("a1", {
      published: false,
      slug: "",
      publishedAt: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    });

    expect(row.published_at).toBeNull();
    expect("created_at" in row).toBe(false);
    expect("updated_at" in row).toBe(false);
    expect("createdAt" in row.data).toBe(false);
    expect("updatedAt" in row.data).toBe(false);
  });
});
