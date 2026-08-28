import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_PHOTOS } from "@/mocks/photos";

/**
 * 챗 문맥의 mock 분기는 다른 공개 getter 와 달리 published 게이트를 거치지 않아도
 * 지금 mock 데이터에는 초안 사진이 없어 증상이 나타나지 않는다. 초안을 주입해
 * 게이트가 실제로 도는지 확인한다.
 */
describe("getChatProfileData (mock)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("초안 사진을 챗 문맥에 넣지 않는다", async () => {
    const draft = { ...MOCK_PHOTOS[0], id: "draft-photo", published: false, order: 999 };
    vi.doMock("@/mocks/photos", () => ({ MOCK_PHOTOS: [...MOCK_PHOTOS, draft] }));

    const { getChatProfileData } = await import("@/lib/content/chat");
    const { photos } = await getChatProfileData({ source: "mock" });

    expect(photos.some(({ id }) => id === "draft-photo")).toBe(false);
    expect(photos).not.toHaveLength(0);
  });

  it("공개 사진은 order 순서로 넣는다", async () => {
    const { getChatProfileData } = await import("@/lib/content/chat");
    const { photos } = await getChatProfileData({ source: "mock" });

    const orders = photos.map(({ id }) => MOCK_PHOTOS.findIndex((photo) => photo.id === id));
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
