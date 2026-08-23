// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { applyCursorGeometry } from "@/features/custom-cursor/_lib/cursor-mode";

describe("applyCursorGeometry", () => {
  it("지원하는 모드의 커서 크기와 모양을 적용한다", () => {
    const cursor = document.createElement("div");

    applyCursorGeometry(cursor, "ring");

    expect(cursor.style.getPropertyValue("--cursor-width")).toBe("34px");
    expect(cursor.style.getPropertyValue("--cursor-height")).toBe("34px");
    expect(cursor.style.getPropertyValue("--cursor-radius")).toBe("999px");
  });

  it("별도 geometry가 없는 모드는 기존 값을 보존한다", () => {
    const cursor = document.createElement("div");
    cursor.style.setProperty("--cursor-width", "12px");

    applyCursorGeometry(cursor, "snap");

    expect(cursor.style.getPropertyValue("--cursor-width")).toBe("12px");
  });

  it("가로 scrollbar에서는 세로 geometry의 폭과 높이를 바꿔 적용한다", () => {
    const cursor = document.createElement("div");

    applyCursorGeometry(cursor, "scrollbar", "horizontal");

    expect(cursor.style.getPropertyValue("--cursor-width")).toBe("28px");
    expect(cursor.style.getPropertyValue("--cursor-height")).toBe("20px");
  });
});
