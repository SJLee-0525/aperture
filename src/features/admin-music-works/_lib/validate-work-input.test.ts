import { describe, expect, it } from "vitest";

import { validateWorkInput } from "@/features/admin-music-works/_lib/validate-work-input";
import { emptyWorkInput } from "@/features/admin-music-works/_lib/work-form-data";

describe("validateWorkInput", () => {
  it("한국어 제목을 요구한다", () => {
    expect(validateWorkInput(emptyWorkInput())).toBe("제목(한국어)을 입력하세요.");
  });

  it("제목이 있으면 저장할 수 있다", () => {
    const input = { ...emptyWorkInput(), title: { ko: "리사이틀", en: "" } };

    expect(validateWorkInput(input)).toBeNull();
  });
});
