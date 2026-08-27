import { describe, expect, it } from "vitest";

import { emptyAwardInput } from "@/features/admin-music-awards/_lib/award-form-data";
import { validateAwardInput } from "@/features/admin-music-awards/_lib/validate-award-input";

describe("validateAwardInput", () => {
  it("한국어 수상명을 먼저 요구한다", () => {
    expect(validateAwardInput(emptyAwardInput())).toContainEqual(expect.objectContaining({ message: "수상명(한국어)을 입력하세요." }));
  });

  it("연도를 비우면 저장할 수 없다", () => {
    const input = { ...emptyAwardInput(), name: { ko: "수상", en: "" }, year: "" };

    expect(validateAwardInput(input)).toContainEqual(expect.objectContaining({ message: "연도를 입력하세요." }));
  });

  it("수상명과 연도가 있으면 저장할 수 있다", () => {
    const input = { ...emptyAwardInput(), name: { ko: "수상", en: "" }, year: "2025" };

    expect(validateAwardInput(input)).toEqual([]);
  });
});
