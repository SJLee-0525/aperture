import { describe, expect, it } from "vitest";

import { encodeArticleRow, encodeListRow } from "@/lib/supabase/admin/row-codec";
import { mergeRow } from "@/lib/supabase/row-merge";

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
  // 디코더가 결측 날짜에 쓰는 epoch 를 그대로 저장하면 편집 한 번으로 1970-01-01 이
  // 공연일·촬영일로 영속된다. 키를 빼서 원래의 결측을 보존한다.
  it("epoch 날짜는 키를 생략해 원래의 결측을 보존한다", () => {
    const row = encodeListRow("w1", {
      order: 0,
      published: false,
      performedAt: new Date(0),
      title: { ko: "제목", en: "Title" },
    });

    expect("performedAt" in row.data).toBe(false);
    expect(row.data.title).toEqual({ ko: "제목", en: "Title" });
  });

  it("유효한 날짜는 그대로 저장한다", () => {
    const performedAt = new Date("2026-03-14T10:30:00.000Z");

    const row = encodeListRow("w1", { order: 0, published: false, performedAt });

    expect(row.data.performedAt).toBe(performedAt.toISOString());
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

  // pinned 는 setDevArticlePinned 만 쓴다. 여기서 함께 쓰면 낡은 폼 스냅샷이 고정을 지운다.
  it("pinned 를 컬럼에도 data 에도 쓰지 않는다", () => {
    const row = encodeArticleRow("a1", {
      published: true,
      pinned: true,
      slug: "chunking",
      publishedAt: new Date("2026-02-01T00:00:00.000Z"),
      body: "# 본문",
    });

    expect("pinned" in row).toBe(false);
    expect("pinned" in row.data).toBe(false);
  });

  // 발행 조건 검사는 메모리 상의 Date 로 이미 통과한 뒤다. 여기서 조용히 null 로
  // 강등하면 published 인데 published_at 이 NULL 인 글이 정렬 맨 뒤로 가라앉는다.
  it("발행 상태인데 publishedAt 이 Date 가 아니면 던진다", () => {
    expect(() =>
      encodeArticleRow("a1", {
        published: true,
        slug: "chunking",
        publishedAt: "2026-02-01T00:00:00.000Z",
        body: "# 본문",
      }),
    ).toThrow("publishedAt");
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
