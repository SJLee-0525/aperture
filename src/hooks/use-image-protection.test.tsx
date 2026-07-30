// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PublicImageProtection } from "@/components/PublicImageProtection";

describe("useImageProtection", () => {
  afterEach(cleanup);

  it.each(["contextmenu", "dragstart", "selectstart"])(
    "보호 이미지 영역의 %s 기본 동작을 차단한다",
    (type) => {
      const { getByTestId } = render(
        <>
          <PublicImageProtection />
          <div data-protected-image>
            <span data-testid="protected" />
          </div>
        </>,
      );

      const allowed = getByTestId("protected").dispatchEvent(
        new Event(type, { bubbles: true, cancelable: true }),
      );

      expect(allowed).toBe(false);
    },
  );

  it("보호 영역 밖의 기본 동작은 유지한다", () => {
    const { getByTestId } = render(
      <>
        <PublicImageProtection />
        <span data-testid="unprotected" />
      </>,
    );

    const allowed = getByTestId("unprotected").dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
    );

    expect(allowed).toBe(true);
  });
});
