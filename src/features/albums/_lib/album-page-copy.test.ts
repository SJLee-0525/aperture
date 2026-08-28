import { describe, expect, it } from "vitest";

import { albumPageDescription } from "@/features/albums/_lib/album-page-copy";

import type { Album } from "@/types/album";

const album = (subtitle: { ko: string; en: string }): Album =>
  ({
    title: { ko: "도시의 밤", en: "City Night" },
    subtitle,
  }) as unknown as Album;

describe("albumPageDescription", () => {
  it("부제가 있으면 제목 뒤에 붙인다", () => {
    const description = albumPageDescription(album({ ko: "야경", en: "Night" }));

    expect(description.ko).toContain("도시의 밤 — 야경.");
    expect(description.en).toContain("City Night — Night.");
  });

  it("부제가 비면 제목만 쓴다", () => {
    const description = albumPageDescription(album({ ko: "", en: "" }));

    expect(description.ko).toBe("도시의 밤 — 사진작가 이성준의 사진 앨범.");
    expect(description.en).toBe("City Night — a photo album by photographer Sungjoon Lee.");
  });
});
