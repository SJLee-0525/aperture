import { describe, expect, it } from "vitest";

import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/features/admin-dev-articles/_lib/dev-article-datetime";

describe("toDateTimeLocalValue", () => {
  it("지역 시각을 입력 형식으로 바꾼다", () => {
    expect(toDateTimeLocalValue(new Date(2026, 7, 12, 9, 5))).toBe("2026-08-12T09:05");
  });

  it("한 자리 값을 0으로 채운다", () => {
    expect(toDateTimeLocalValue(new Date(2026, 0, 2, 3, 4))).toBe("2026-01-02T03:04");
  });

  it("값이 없거나 잘못된 시각이면 빈 문자열이다", () => {
    expect(toDateTimeLocalValue(null)).toBe("");
    expect(toDateTimeLocalValue(new Date("어제"))).toBe("");
  });
});

describe("fromDateTimeLocalValue", () => {
  it("입력 값을 지역 시각으로 읽는다", () => {
    const date = fromDateTimeLocalValue("2026-08-12T09:05");

    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(12);
    expect(date?.getHours()).toBe(9);
    expect(date?.getMinutes()).toBe(5);
  });

  it("초까지 붙은 값도 읽는다", () => {
    expect(fromDateTimeLocalValue("2026-08-12T09:05:30")?.getMinutes()).toBe(5);
  });

  it("비었거나 형식이 어긋나면 null 이다", () => {
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue("2026-08-12")).toBeNull();
    expect(fromDateTimeLocalValue("어제")).toBeNull();
  });

  it("없는 날짜는 다음 달로 넘기지 않고 거부한다", () => {
    expect(fromDateTimeLocalValue("2026-02-30T09:00")).toBeNull();
    expect(fromDateTimeLocalValue("2026-02-28T09:00")).not.toBeNull();
  });

  it("두 자리 연도를 1900년대로 옮기지 않는다", () => {
    expect(fromDateTimeLocalValue("0050-03-01T09:00")?.getFullYear()).toBe(50);
    expect(fromDateTimeLocalValue("0050-02-29T09:00")).toBeNull();
  });

  it("입력 형식과 왕복한다", () => {
    const value = "2026-12-31T23:59";

    expect(toDateTimeLocalValue(fromDateTimeLocalValue(value))).toBe(value);
  });
});
