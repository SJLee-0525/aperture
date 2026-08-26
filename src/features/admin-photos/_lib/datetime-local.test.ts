import { describe, expect, it } from "vitest";

import { fromDatetimeLocal, toDatetimeLocal } from "@/features/admin-photos/_lib/datetime-local";

describe("datetime-local 변환", () => {
  it("로컬 날짜를 datetime-local 입력 형식으로 변환한다", () => {
    expect(toDatetimeLocal(new Date(2026, 0, 2, 3, 4))).toBe("2026-01-02T03:04");
  });

  it("유효하지 않은 날짜는 빈 입력값으로 변환한다", () => {
    expect(toDatetimeLocal(new Date(Number.NaN))).toBe("");
  });

  // epoch 는 디코더가 "값 없음"에 쓰는 표현이다. 날짜로 그리면 관리자가 그것을 실제
  // 촬영일로 읽는데, 저장 경계는 같은 값을 저장하지 않아 화면과 결과가 갈린다.
  it("epoch 는 빈 입력값으로 변환한다", () => {
    expect(toDatetimeLocal(new Date(0))).toBe("");
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

  // 빈 입력은 "값 없음"이므로 지금 시각이 아니라 epoch 로 돌려준다. 저장 경계가
  // 이 값을 만나면 키를 빼서 원래의 결측을 보존한다.
  it.each(["", "not-a-date"])("%j 입력은 값 없음(epoch)으로 변환한다", (value) => {
    expect(fromDatetimeLocal(value)).toEqual(new Date(0));
  });
});
