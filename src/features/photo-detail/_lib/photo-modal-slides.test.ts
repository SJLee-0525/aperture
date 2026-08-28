import { describe, expect, it } from "vitest";

import { buildPhotoModalSlides } from "@/features/photo-detail/_lib/photo-modal-slides";

import type { Photo } from "@/types/photo";

const photo = (id: string) => ({ id }) as unknown as Photo;
const noRetries = () => 0;

describe("buildPhotoModalSlides", () => {
  it("이전·현재·다음 순서로 세 장을 만들고 현재만 표시한다", () => {
    const slides = buildPhotoModalSlides(
      photo("b"),
      { previous: photo("a"), next: photo("c") },
      noRetries,
    );

    expect(slides.map(({ item }) => item?.id)).toEqual(["a", "b", "c"]);
    expect(slides.map(({ current }) => current)).toEqual([false, true, false]);
  });

  it("사진이 2장이면 이전과 다음이 같은 문서라도 키가 겹치지 않는다", () => {
    // 키가 겹치면 React 가 같은 슬라이드로 보고 한쪽을 그리지 않는다.
    const slides = buildPhotoModalSlides(
      photo("b"),
      { previous: photo("a"), next: photo("a") },
      noRetries,
    );

    expect(new Set(slides.map(({ key }) => key)).size).toBe(3);
  });

  it("이웃을 아직 못 받았으면 빈 자리로 둔다", () => {
    const slides = buildPhotoModalSlides(photo("b"), { previous: null, next: null }, noRetries);

    expect(slides.map(({ key }) => key)).toEqual(["empty-previous", "b@0", "empty-next"]);
    expect(slides.map(({ item }) => item)).toEqual([null, photo("b"), null]);
  });

  it("재시도 횟수가 키에 섞인다", () => {
    // 같은 src 를 그대로 두면 브라우저가 다시 받지 않는다. 키가 바뀌어야 img 가 새로 붙는다.
    const retried = buildPhotoModalSlides(
      photo("b"),
      { previous: null, next: null },
      (id) => (id === "b" ? 2 : 0),
    );

    expect(retried[1]?.key).toBe("b@2");
  });
});
