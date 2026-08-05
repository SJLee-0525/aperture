// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { resolveCursorTarget } from "@/features/custom-cursor/_lib/cursor-target";

describe("resolveCursorTarget", () => {
  it("링크의 자식 노드를 interactive target으로 정규화한다", () => {
    const link = document.createElement("a");
    const label = document.createElement("span");
    link.append(label);

    expect(resolveCursorTarget(label)).toMatchObject({ kind: "interactive", snapTarget: link });
  });

  it("range와 text 입력을 서로 다른 target으로 분류한다", () => {
    const range = document.createElement("input");
    range.type = "range";
    const text = document.createElement("input");
    text.type = "search";

    expect(resolveCursorTarget(range).kind).toBe("range");
    expect(resolveCursorTarget(text).kind).toBe("text");
  });

  it("custom scrollbar는 role=scrollbar보다 전용 target이 우선한다", () => {
    const track = document.createElement("div");
    track.dataset.customScrollbarUi = "";
    track.setAttribute("role", "scrollbar");

    expect(resolveCursorTarget(track)).toMatchObject({ kind: "scrollbar", element: track });
  });

  it("native checkbox에서는 custom cursor를 숨길 수 있도록 분류한다", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    expect(resolveCursorTarget(checkbox).kind).toBe("native");
  });

  it("iframe도 native로 분류해 기본 커서에 넘긴다", () => {
    // 교차 출처 문서에는 부모의 cursor:none 이 닿지 않는다 — 넘기지 않으면 커스텀 커서가
    // 경계에 굳은 채 안에서 기본 화살표가 따로 움직여 커서가 둘로 보인다. (hCaptcha·YouTube)
    const iframe = document.createElement("iframe");

    expect(resolveCursorTarget(iframe).kind).toBe("native");
  });
});
