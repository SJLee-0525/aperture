import { describe, expect, it } from "vitest";

import { emptyAlbumInput } from "@/features/admin-albums/_lib/album-form-data";
import { validateAlbumInput } from "@/features/admin-albums/_lib/validate-album-input";

import type { AlbumInput } from "@/lib/supabase/albums";

describe("validateAlbumInput", () => {
  it("한국어 제목을 먼저 요구한다", () => {
    expect(validateAlbumInput(emptyAlbumInput())).toContainEqual(expect.objectContaining({ message: "제목(한국어)을 입력하세요." }));
  });

  it("제목이 있으면 사진을 최소 한 장 요구한다", () => {
    const input = { ...emptyAlbumInput(), title: { ko: "앨범", en: "" } };

    expect(validateAlbumInput(input)).toContainEqual(expect.objectContaining({ message: "앨범에 넣을 사진을 최소 한 장 이상 선택하세요." }));
  });

  it("제목과 사진이 있으면 저장할 수 있다", () => {
    const input = {
      ...emptyAlbumInput(),
      title: { ko: "앨범", en: "" },
      coverPhotoId: "p1",
      photoIds: ["p1"],
    };

    expect(validateAlbumInput(input)).toEqual([]);
  });
});

/**
 * 검증이 내는 `field` 이름은 폼이 화면 컨트롤에 붙인 이름과 같아야 한다.
 * 어긋나면 `focusFirstIssue` 가 대상을 못 찾고 `issueFor` 도 비어, 저장만 막히고
 * 화면에는 아무 표시가 남지 않는다.
 */
describe("검증 field 이름과 화면 컨트롤", () => {
  it("title.ko 와 photoIds 를 그 순서로 낸다", () => {
    const issues = validateAlbumInput({
      title: { ko: "", en: "" },
      photoIds: [],
    } as unknown as AlbumInput);

    expect(issues.map(({ field }) => field)).toEqual(["title.ko", "photoIds"]);
  });
});
