import { describe, expect, it } from "vitest";

import { emptyProjectInput } from "@/features/admin-dev-projects/_lib/project-form-data";
import { validateProjectInput } from "@/features/admin-dev-projects/_lib/validate-project-input";

describe("validateProjectInput", () => {
  it("한국어 제목을 요구한다", () => {
    expect(validateProjectInput(emptyProjectInput())).toContainEqual(
      expect.objectContaining({ message: "제목(한국어)을 입력하세요." }),
    );
  });

  it("제목이 있으면 저장할 수 있다", () => {
    const input = { ...emptyProjectInput(), title: { ko: "프로젝트", en: "" } };

    expect(validateProjectInput(input)).toEqual([]);
  });
});
