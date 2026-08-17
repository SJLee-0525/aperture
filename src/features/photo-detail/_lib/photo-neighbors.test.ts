import { describe, expect, it } from "vitest";

import { readPhotoNeighbors } from "@/features/photo-detail/_lib/photo-neighbors";

import type { Photo } from "@/types/photo";

const photo = (id: string) => ({ id }) as Photo;

const cacheOf = (...ids: string[]) => new Map(ids.map((id) => [id, photo(id)]));

describe("readPhotoNeighbors", () => {
  const ids = ["p1", "p2", "p3"];

  it("가운데 사진의 앞뒤를 찾는다", () => {
    const neighbors = readPhotoNeighbors(ids, cacheOf(...ids), 1);

    expect(neighbors.previous?.id).toBe("p1");
    expect(neighbors.next?.id).toBe("p3");
  });

  it("처음의 이전은 마지막, 마지막의 다음은 처음이다", () => {
    expect(readPhotoNeighbors(ids, cacheOf(...ids), 0).previous?.id).toBe("p3");
    expect(readPhotoNeighbors(ids, cacheOf(...ids), 2).next?.id).toBe("p1");
  });

  it("사진이 2장이면 이전과 다음이 같은 문서다", () => {
    const two = ["p1", "p2"];
    const neighbors = readPhotoNeighbors(two, cacheOf(...two), 0);

    expect(neighbors.previous?.id).toBe("p2");
    expect(neighbors.next?.id).toBe("p2");
  });

  it("사진이 1장이면 이웃이 없다", () => {
    expect(readPhotoNeighbors(["p1"], cacheOf("p1"), 0)).toEqual({ previous: null, next: null });
  });

  it("현재 사진을 순서에서 못 찾으면 이웃이 없다", () => {
    expect(readPhotoNeighbors(ids, cacheOf(...ids), -1)).toEqual({ previous: null, next: null });
  });

  it("상세를 아직 받지 못한 이웃은 null 로 남는다", () => {
    const neighbors = readPhotoNeighbors(ids, cacheOf("p2", "p3"), 1);

    expect(neighbors.previous).toBeNull();
    expect(neighbors.next?.id).toBe("p3");
  });

  it("순서가 비어 있으면 이웃이 없다", () => {
    expect(readPhotoNeighbors([], new Map(), 0)).toEqual({ previous: null, next: null });
  });
});
