import { describe, expect, it } from "vitest";

import { validateAlbumInput } from "@/features/admin-albums/_lib/validate-album-input";
import { validatePhotoInput } from "@/features/admin-photos/_lib/validate-photo-input";

import type { AlbumInput } from "@/lib/supabase/albums";
import type { PhotoInput } from "@/lib/supabase/photos";

/**
 * 검증이 내는 `field` 이름은 폼이 화면 컨트롤에 붙인 이름과 같아야 한다.
 * 어긋나면 `focusFirstIssue` 가 대상을 못 찾고 `issueFor` 도 비어, 저장만 막히고
 * 화면에는 아무 표시가 남지 않는다. 이 대조가 그 상태를 잡는다.
 */
describe("검증 field 이름과 화면 컨트롤", () => {
  it("사진은 image 와 title.ko 를 낸다", () => {
    const issues = validatePhotoInput({
      image: { url: "", path: "", w: 0, h: 0 },
      title: { ko: "", en: "" },
    } as PhotoInput);

    expect(issues.map(({ field }) => field)).toEqual(["image", "title.ko"]);
  });

  it("앨범은 title.ko 와 photoIds 를 낸다", () => {
    const issues = validateAlbumInput({
      title: { ko: "", en: "" },
      photoIds: [],
    } as unknown as AlbumInput);

    expect(issues.map(({ field }) => field)).toEqual(["title.ko", "photoIds"]);
  });
});
