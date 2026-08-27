// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PublicImageProtection } from "@/components/PublicImageProtection";

const renderProtectedFigure = () =>
  render(
    <>
      <PublicImageProtection />
      <div data-protected-image>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-testid="image" src="/photo.webp" alt="" />
        <span data-testid="caption">새벽의 항구</span>
      </div>
    </>,
  );

const fire = (element: Element, type: string) =>
  element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

describe("useImageProtection", () => {
  afterEach(cleanup);

  it.each(["contextmenu", "dragstart", "selectstart"])(
    "보호 영역 안의 이미지에서 %s 기본 동작을 차단한다",
    (type) => {
      const { getByTestId } = renderProtectedFigure();

      expect(fire(getByTestId("image"), type)).toBe(false);
    },
  );

  it.each(["contextmenu", "dragstart", "selectstart"])(
    "같은 영역의 텍스트에서는 %s 를 막지 않는다",
    (type) => {
      // 래퍼가 링크나 hero 전체를 감싸는 곳이 있어 제목·촬영 정보가 함께 잠기면 안 된다.
      const { getByTestId } = renderProtectedFigure();

      expect(fire(getByTestId("caption"), type)).toBe(true);
    },
  );

  it("보호 영역 밖의 기본 동작은 유지한다", () => {
    const { getByTestId } = render(
      <>
        <PublicImageProtection />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-testid="unprotected" src="/photo.webp" alt="" />
      </>,
    );

    expect(fire(getByTestId("unprotected"), "contextmenu")).toBe(true);
  });
});
