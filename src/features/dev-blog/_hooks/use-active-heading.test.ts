// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useActiveHeading } from "@/features/dev-blog/_hooks/use-active-heading";

const IDS = ["intro", "cost", "security", "images", "wrap-up"];

/** 문서 좌표에서의 heading 위치. 스크롤 위치를 빼면 뷰포트 좌표가 된다. */
const DOCUMENT_TOP: Record<string, number> = {
  intro: 400,
  cost: 1200,
  security: 2000,
  images: 2800,
  "wrap-up": 3600,
};

let scrollY = 0;
let frames: Array<() => void> = [];

/** 예약된 rAF 콜백을 모두 흘려 보낸다. */
const flushFrames = () => {
  act(() => {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback());
  });
};

/** 한 프레임에 목표 위치로 건너뛴다 — 밴드를 밟지 않고 지나가는 빠른 스크롤. */
const jumpTo = (y: number) => {
  scrollY = y;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
  flushFrames();
};

beforeEach(() => {
  scrollY = 0;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(() => callback(0));
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );

  document.body.innerHTML = IDS.map((id) => `<h2 id="${id}">${id}</h2>`).join("");
  IDS.forEach((id) => {
    const heading = document.getElementById(id);
    Object.defineProperty(heading, "getBoundingClientRect", {
      value: () => ({ top: DOCUMENT_TOP[id] - scrollY }) as DOMRect,
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("useActiveHeading", () => {
  it("기준선을 지난 마지막 heading 을 고른다", () => {
    const { result } = renderHook(() => useActiveHeading(IDS));
    expect(result.current).toBeNull();

    jumpTo(1200);
    expect(result.current).toBe("cost");
  });

  it("한 번에 여러 heading 을 건너뛰어도 현재 위치를 따라간다", () => {
    const { result } = renderHook(() => useActiveHeading(IDS));

    // 관찰 밴드에 걸리는 순간이 한 번도 없는 이동 — 예전 구현이 여기서 멈췄다.
    jumpTo(3600);
    expect(result.current).toBe("wrap-up");

    jumpTo(1200);
    expect(result.current).toBe("cost");

    jumpTo(0);
    expect(result.current).toBeNull();
  });

  it("아래로 크게 왕복해도 값이 남지 않는다", () => {
    const { result } = renderHook(() => useActiveHeading(IDS));

    for (let round = 0; round < 3; round += 1) {
      jumpTo(3600);
      jumpTo(300);
      expect(result.current).toBeNull();
    }
  });
});
