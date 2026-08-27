// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { findVerticalScroller } from "@/features/custom-cursor/_lib/vertical-scroller";

const setScrollable = (element: HTMLElement, scrollHeight: number, clientHeight: number) => {
  Object.defineProperty(element, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: clientHeight, configurable: true });
};

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.style.overflowY = "";
  document.body.style.overflowY = "";
});

describe("findVerticalScroller", () => {
  it("스크롤 가능한 조상을 돌려준다", () => {
    const panel = document.createElement("div");
    panel.style.overflowY = "auto";
    setScrollable(panel, 900, 300);
    const inner = document.createElement("span");
    panel.append(inner);
    document.body.append(panel);

    expect(findVerticalScroller(inner)).toBe(panel);
  });

  it("넘칠 것이 없는 조상은 건너뛴다", () => {
    const panel = document.createElement("div");
    panel.style.overflowY = "auto";
    setScrollable(panel, 300, 300);
    const inner = document.createElement("span");
    panel.append(inner);
    document.body.append(panel);
    setScrollable(document.documentElement, 2000, 800);

    expect(findVerticalScroller(inner)).toBe(document.documentElement);
  });

  it("루트가 스크롤을 막고 있으면 null 이다", () => {
    setScrollable(document.documentElement, 2000, 800);
    document.documentElement.style.overflowY = "hidden";

    expect(findVerticalScroller(document.body)).toBeNull();
  });

  it("문서가 넘치지 않으면 null 이다", () => {
    setScrollable(document.documentElement, 700, 800);

    expect(findVerticalScroller(document.body)).toBeNull();
  });
});
