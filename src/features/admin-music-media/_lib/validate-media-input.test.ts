import { describe, expect, it } from "vitest";

import { emptyMediaInput } from "@/features/admin-music-media/_lib/media-form-data";
import { validateMediaInput } from "@/features/admin-music-media/_lib/validate-media-input";

describe("validateMediaInput", () => {
  it("한국어 제목을 요구한다", () => {
    expect(validateMediaInput(emptyMediaInput())).toBe("제목(한국어)을 입력하세요.");
  });

  it("제목이 있으면 저장할 수 있다", () => {
    const input = { ...emptyMediaInput(), title: { ko: "실황", en: "" } };

    expect(validateMediaInput(input)).toBeNull();
  });
});
