import type { FieldIssue } from "@/lib/admin/field-issue";
import type { AlbumInput } from "@/lib/supabase/albums";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateAlbumInput = (input: AlbumInput): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  if (!input.title.ko.trim()) {
    issues.push({ field: "title.ko", message: "제목(한국어)을 입력하세요." });
  }
  if (input.photoIds.length === 0) {
    issues.push({ field: "photoIds", message: "앨범에 넣을 사진을 최소 한 장 이상 선택하세요." });
  }
  return issues;
};

export { validateAlbumInput };
