import { describe, expect, it } from "vitest";

import { mergePhotoCache } from "@/features/photo-detail/_lib/photo-cache";

import type { Photo } from "@/types/photo";

describe("mergePhotoCache", () => {
  it("최근 상세 사진만 제한된 개수로 유지한다", () => {
    const current = new Map(["old-1", "old-2", "old-3"].map((id) => [id, { id } as Photo]));

    const next = mergePhotoCache(current, [{ id: "new-1" }, { id: "new-2" }] as Photo[], 3);

    expect([...next.keys()]).toEqual(["old-3", "new-1", "new-2"]);
    expect(current.size).toBe(3);
  });

  it("다시 받은 사진은 가장 최근 항목으로 이동한다", () => {
    const current = new Map(["first", "second", "third"].map((id) => [id, { id } as Photo]));

    const next = mergePhotoCache(current, [{ id: "first" }] as Photo[], 3);

    expect([...next.keys()]).toEqual(["second", "third", "first"]);
  });
});
