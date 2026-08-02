import { describe, expect, it, vi } from "vitest";

import { fromDatetimeLocal, toDatetimeLocal } from "@/features/admin-photos/_lib/datetime-local";

describe("datetime-local 변환", () => {
  it("로컬 날짜를 datetime-local 입력 형식으로 변환한다", () => {
    expect(toDatetimeLocal(new Date(2026, 0, 2, 3, 4))).toBe("2026-01-02T03:04");
  });

  it("유효하지 않은 날짜는 빈 입력값으로 변환한다", () => {
    expect(toDatetimeLocal(new Date(Number.NaN))).toBe("");
  });

  it("datetime-local 입력값을 로컬 Date로 변환한다", () => {
    const result = fromDatetimeLocal("2026-01-02T03:04");

    expect([
      result.getFullYear(),
      result.getMonth(),
      result.getDate(),
      result.getHours(),
      result.getMinutes(),
    ]).toEqual([2026, 0, 2, 3, 4]);
  });

  it.each(["", "not-a-date"])("%j 입력에는 현재 시각을 사용한다", (value) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 8, 9, 10));

    expect(fromDatetimeLocal(value)).toEqual(new Date(2026, 6, 8, 9, 10));
    vi.useRealTimers();
  });
});
