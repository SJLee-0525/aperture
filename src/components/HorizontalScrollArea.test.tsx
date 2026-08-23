// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";

describe("HorizontalScrollArea", () => {
  afterEach(cleanup);

  it("시각용 track을 접근성 트리에서 제외한다", () => {
    const { container } = render(
      <HorizontalScrollArea label="테스트 표">
        <table />
      </HorizontalScrollArea>,
    );

    expect(container.querySelector("[data-custom-horizontal-scrollbar-ui]")?.ariaHidden).toBe(
      "true",
    );
  });

  it("pointer가 취소되면 dragging 상태를 정리한다", () => {
    const { container } = render(
      <HorizontalScrollArea as="pre">
        <code>긴 코드</code>
      </HorizontalScrollArea>,
    );
    const track = container.querySelector<HTMLElement>("[data-custom-horizontal-scrollbar-ui]")!;
    track.setPointerCapture = vi.fn();
    track.hasPointerCapture = vi.fn(() => false);

    fireEvent.pointerDown(track, { pointerId: 7, clientX: 10 });
    expect(track.dataset.dragging).toBe("true");

    fireEvent.pointerCancel(track, { pointerId: 7 });
    expect(track.dataset.dragging).toBe("false");
  });
});
