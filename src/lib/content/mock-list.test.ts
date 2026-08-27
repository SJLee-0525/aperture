import { describe, expect, it } from "vitest";

import { getDevProjects } from "@/lib/content/dev";
import { publishedInOrder } from "@/lib/content/mock-list";
import { getMusicAwards, getMusicMedia, getMusicWorks } from "@/lib/content/music";
import { getAlbums, getPhotos } from "@/lib/content/photo";

import { MOCK_ALBUMS } from "@/mocks/albums";
import { MOCK_DEV_PROJECTS } from "@/mocks/dev";
import { MOCK_MUSIC_AWARDS, MOCK_MUSIC_MEDIA, MOCK_MUSIC_WORKS } from "@/mocks/music";
import { MOCK_PHOTOS } from "@/mocks/photos";

const item = (id: string, order: number, published: boolean) => ({ id, order, published });

describe("publishedInOrder", () => {
  it("초안을 제외한다", () => {
    const result = publishedInOrder([item("a", 0, true), item("b", 1, false), item("c", 2, true)]);

    expect(result.map(({ id }) => id)).toEqual(["a", "c"]);
  });

  it("order 오름차순으로 정렬한다", () => {
    const result = publishedInOrder([item("a", 2, true), item("b", 0, true), item("c", 1, true)]);

    expect(result.map(({ id }) => id)).toEqual(["b", "c", "a"]);
  });

  it("order 가 같으면 id 오름차순을 2차 키로 쓴다", () => {
    const result = publishedInOrder([item("c", 0, true), item("a", 0, true), item("b", 0, true)]);

    expect(result.map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const items = [item("b", 1, true), item("a", 0, true)];

    publishedInOrder(items);

    expect(items.map(({ id }) => id)).toEqual(["b", "a"]);
  });
});

type ListedItem = { id: string; order: number; published: boolean };

/** it.each 가 컬렉션별 엔티티 타입을 union 으로 넓히므로 목록 계약만 남긴 형태로 받는다. */
const gatedGetters: Array<[string, () => Promise<ListedItem[]>, ListedItem[]]> = [
  ["사진", getPhotos, MOCK_PHOTOS],
  ["앨범", getAlbums, MOCK_ALBUMS],
  ["연주", getMusicWorks, MOCK_MUSIC_WORKS],
  ["수상", getMusicAwards, MOCK_MUSIC_AWARDS],
  ["영상", getMusicMedia, MOCK_MUSIC_MEDIA],
  ["프로젝트", getDevProjects, MOCK_DEV_PROJECTS],
];

describe("mock getter 의 공개 게이트", () => {
  // getter 가 게이트를 빠뜨리면 여기서 순서나 개수가 어긋난다. 화면 페이지네이션이 없어
  // 목록 전량이 그대로 렌더되므로, 이 대조가 유일한 신호다.
  it.each(gatedGetters)(
    "%s getter 가 publishedInOrder 와 같은 결과를 낸다",
    async (_label, getter, source) => {
      const items = await getter();

      expect(items.map(({ id }) => id)).toEqual(publishedInOrder(source).map(({ id }) => id));
    },
  );
});
