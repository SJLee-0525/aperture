import { describe, expect, it } from "vitest";

import { photoToInput } from "@/features/admin-photos/_lib/photo-form-data";
import { validatePhotoInput } from "@/features/admin-photos/_lib/validate-photo-input";

import type { PhotoInput } from "@/lib/supabase/photos";

describe("validatePhotoInput", () => {
  it("한국어 제목을 먼저 요구한다", () => {
    expect(validatePhotoInput(photoToInput())).toContainEqual(
      expect.objectContaining({ message: "제목(한국어)을 입력하세요." }),
    );
  });

  it("제목이 있으면 업로드된 이미지를 요구한다", () => {
    const input = { ...photoToInput(), title: { ko: "사진", en: "" } };

    expect(validatePhotoInput(input)).toContainEqual(
      expect.objectContaining({ message: "이미지를 먼저 업로드하세요." }),
    );
  });

  it("한국어 제목과 이미지가 있으면 저장할 수 있다", () => {
    const input = {
      ...photoToInput(),
      title: { ko: "사진", en: "" },
      image: { url: "/photo.webp", path: "photos/photo.webp", w: 100, h: 100 },
    };

    expect(validatePhotoInput(input)).toEqual([]);
  });
});

/**
 * 검증이 내는 `field` 이름은 폼이 화면 컨트롤에 붙인 이름과 같아야 한다.
 * 어긋나면 `focusFirstIssue` 가 대상을 못 찾고 `issueFor` 도 비어, 저장만 막히고
 * 화면에는 아무 표시가 남지 않는다.
 */
describe("검증 field 이름과 화면 컨트롤", () => {
  it("image 와 title.ko 를 그 순서로 낸다", () => {
    const issues = validatePhotoInput({
      image: { url: "", path: "", w: 0, h: 0 },
      title: { ko: "", en: "" },
    } as PhotoInput);

    expect(issues.map(({ field }) => field)).toEqual(["image", "title.ko"]);
  });
});
