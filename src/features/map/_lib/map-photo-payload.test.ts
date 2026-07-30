import { describe, expect, it } from "vitest";

import { adjacentPhotos, revivePhoto, serializePhoto } from "@/features/map/_lib/map-photo-payload";
import type { Photo } from "@/types/photo";

const photos = [
  { id: "first", shotAt: new Date("2026-01-01T00:00:00.000Z") },
  { id: "second", shotAt: new Date("2026-01-02T00:00:00.000Z") },
  { id: "third", shotAt: new Date("2026-01-03T00:00:00.000Z") },
] as Photo[];

describe("map photo payload", () => {
  it("현재 사진과 순환하는 양옆 사진만 선택한다", () => {
    expect(adjacentPhotos(photos, "first").map((photo) => photo.id)).toEqual([
      "third",
      "first",
      "second",
    ]);
  });

  it("사진이 둘뿐이어도 중복 없이 반환한다", () => {
    expect(adjacentPhotos(photos.slice(0, 2), "first").map((photo) => photo.id)).toEqual([
      "second",
      "first",
    ]);
  });

  it("촬영일을 API 전송 형식으로 직렬화한 뒤 Date로 복원한다", () => {
    const serialized = serializePhoto(photos[0]);
    const revived = revivePhoto(serialized);

    expect(serialized.shotAt).toBe("2026-01-01T00:00:00.000Z");
    expect(revived.shotAt).toBeInstanceOf(Date);
    expect(revived.shotAt.toISOString()).toBe(serialized.shotAt);
  });
});
