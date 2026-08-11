import { describe, expect, it } from "vitest";

import {
  clampLimit,
  clampToolText,
  countLabel,
  formatToolItems,
  formatToolList,
  DEFAULT_LIST_LIMIT,
  TOOL_OUTPUT_BUDGET,
} from "./tool-output";

describe("clampLimit", () => {
  it("해석 불가하거나 1 미만이면 기본 8", () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit("")).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit("abc")).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(0)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(-3)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(Number.NaN)).toBe(DEFAULT_LIST_LIMIT);
  });

  it("에이전트가 보내는 문자열 숫자도 받는다 — 스키마 위반이지만 흔하다", () => {
    expect(clampLimit("3")).toBe(3);
    expect(clampLimit(" 12 ")).toBe(12);
    expect(clampLimit("999")).toBe(20);
  });

  it("정수 내림 + 상한 20", () => {
    expect(clampLimit(3.9)).toBe(3);
    expect(clampLimit(20)).toBe(20);
    expect(clampLimit(999)).toBe(20);
  });
});

describe("countLabel", () => {
  it("단수에는 단수형을 쓴다 — 도구 문구가 답변에 그대로 실린다", () => {
    expect(countLabel(1, "photo")).toBe("1 photo");
    expect(countLabel(0, "photo")).toBe("0 photos");
    expect(countLabel(9, "photo")).toBe("9 photos");
  });

  it("불규칙 복수형을 받을 수 있다", () => {
    expect(countLabel(1, "entry", "entries")).toBe("1 entry");
    expect(countLabel(3, "entry", "entries")).toBe("3 entries");
  });
});

describe("formatToolItems", () => {
  it("limit 클램프 → 줄 변환 → 예산 포맷을 한 번에 처리한다", () => {
    const items = ["a", "b", "c", "d"];
    expect(formatToolItems(items, 2, (item) => `line-${item}`)).toBe("line-a\nline-b\n+2 more");
    expect(formatToolItems(items, undefined, (item) => item)).toBe("a\nb\nc\nd");
  });
});

describe("formatToolList", () => {
  it("예산 안이면 전부 이어 붙인다", () => {
    expect(formatToolList(["a · /ko/a", "b · /ko/b"], 2)).toBe("a · /ko/a\nb · /ko/b");
  });

  it("표시하지 못한 건수를 +N more 로 명시한다 — 조용한 절단 없음", () => {
    expect(formatToolList(["a"], 5)).toBe("a\n+4 more");
  });

  it("예산 도달 시 중단하고 남은 건수를 합산한다", () => {
    const line = "x".repeat(400);
    const result = formatToolList([line, line, line, line, line], 5);
    expect(result.length).toBeLessThanOrEqual(TOOL_OUTPUT_BUDGET);
    expect(result).toMatch(/\+2 more$/);
  });

  it("첫 줄부터 예산을 넘으면 +N more 만 반환한다", () => {
    const huge = "x".repeat(TOOL_OUTPUT_BUDGET);
    expect(formatToolList([huge], 3)).toBe("+3 more");
  });
});

describe("clampToolText", () => {
  it("예산 이하는 그대로", () => {
    expect(clampToolText("short")).toBe("short");
  });

  it("예산 초과는 말줄임으로 절단한다", () => {
    const clamped = clampToolText("y".repeat(TOOL_OUTPUT_BUDGET + 100));
    expect(clamped.length).toBe(TOOL_OUTPUT_BUDGET);
    expect(clamped.endsWith("…")).toBe(true);
  });
});
