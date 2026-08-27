// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCursorState } from "@/features/custom-cursor/_lib/cursor-state";

/** 프레임을 기다리지 않고 그리기를 바로 돌린다. */
const runFrames = () => {
  vi.mocked(window.requestAnimationFrame).mock.calls.forEach(([callback]) => callback(0));
  vi.mocked(window.requestAnimationFrame).mockClear();
};

const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

let cursor: HTMLDivElement;
let anchor: HTMLDivElement;

const create = (pathname = "/ko/photo") => {
  const state = createCursorState({
    cursor,
    autoScrollAnchor: anchor,
    isEnabled: () => true,
    getPathname: () => pathname,
  });
  state.setPointer(100, 200);
  return state;
};

const targetElement = (bounds: DOMRect, dataset: Record<string, string> = {}) => {
  const element = document.createElement("a");
  Object.assign(element.dataset, dataset);
  element.getBoundingClientRect = () => bounds;
  document.body.append(element);
  return element;
};

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  cursor = document.createElement("div");
  anchor = document.createElement("div");
  document.body.append(cursor, anchor);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createCursorState — 모드 판정", () => {
  it("대상이 없으면 점을 그린다", () => {
    const state = create();

    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("dot");
    expect(cursor.style.transform).toBe("translate3d(100px, 200px, 0)");
  });

  it("대기 중이면 점 대신 대기 표시를 그린다", () => {
    const state = create();

    state.setLoading(true);
    runFrames();

    expect(cursor.dataset.mode).toBe("loading");
    expect(cursor.dataset.loading).toBe("true");
  });

  it("자동 스크롤이 다른 모든 상태를 이긴다", () => {
    const state = create();

    state.setScrolling(true);
    state.setMapHovered(true);
    state.setHover("text");
    state.setAutoScrolling(true);
    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("autoscroll");
  });

  it("휠 스크롤이 호버보다 앞선다", () => {
    const state = create();

    state.setHover("text");
    state.setScrolling(true);
    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("scroll");
  });

  it("지도 호버는 링을 그린다", () => {
    const state = create();

    state.setMapHovered(true);
    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("ring");
  });

  it("호버 종류가 그대로 모드가 된다", () => {
    const state = create();

    state.setHover("range");
    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("range");
  });
});

describe("createCursorState — 대상 스냅", () => {
  it("작은 대상에는 스냅해 중심으로 옮긴다", () => {
    const state = create();
    const element = targetElement(rect(40, 60, 120, 40));

    state.setTarget(element);
    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("snap");
    expect(element.dataset.cursorSnapped).toBe("true");
    expect(cursor.style.transform).toBe("translate3d(100px, 80px, 0)");
  });

  it("스냅이 풀리면 이전 대상의 표식을 지운다", () => {
    const state = create();
    const element = targetElement(rect(40, 60, 120, 40));

    state.setTarget(element);
    state.scheduleDraw();
    runFrames();
    state.setTarget(null);
    state.scheduleDraw();
    runFrames();

    expect(element.dataset.cursorSnapped).toBeUndefined();
  });

  it("큰 대상은 프레임으로 그리고 가까운 모서리를 기록한다", () => {
    const state = create();
    const element = targetElement(rect(0, 0, 800, 600), { cursorLarge: "frame" });

    state.setTarget(element);
    state.scheduleDraw();
    runFrames();

    expect(cursor.dataset.mode).toBe("frame");
    expect(cursor.dataset.corner).toBe("top-left");
  });

  it("같은 대상을 다시 넣으면 바뀌지 않았다고 답한다", () => {
    const state = create();
    const element = targetElement(rect(40, 60, 120, 40));

    expect(state.setTarget(element)).toBe(true);
    expect(state.setTarget(element)).toBe(false);
  });
});

describe("createCursorState — accent", () => {
  it("섹션 안에서는 그 섹션의 accent 를 쓴다", () => {
    const state = create();
    const section = document.createElement("div");
    section.dataset.section = "music";
    document.body.append(section);

    state.setAccent(section);

    expect(cursor.style.getPropertyValue("--cursor-accent")).toBe("var(--accent-music)");
    expect(anchor.style.getPropertyValue("--cursor-accent")).toBe("var(--accent-music)");
  });

  it("랜딩의 섹션 밖은 중립색이다", () => {
    const state = create("/ko");

    state.setAccent(null);

    expect(cursor.style.getPropertyValue("--cursor-accent")).toBe("var(--cursor-landing-accent)");
  });

  it("섹션 밖의 다른 지면은 기본 accent 다", () => {
    const state = create("/ko/search");

    state.setAccent(null);

    expect(cursor.style.getPropertyValue("--cursor-accent")).toBe("var(--accent)");
  });
});
