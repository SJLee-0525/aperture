import type { FieldIssue } from "@/lib/admin/field-issue";
import type { PhotoInput } from "@/lib/supabase/photos";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validatePhotoInput = (input: PhotoInput): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  if (!input.image.url) {
    issues.push({ field: "image", message: "이미지를 먼저 업로드하세요." });
  }
  if (!input.title.ko.trim()) {
    issues.push({ field: "title.ko", message: "제목(한국어)을 입력하세요." });
  }
  return issues;
};

export { validatePhotoInput };
