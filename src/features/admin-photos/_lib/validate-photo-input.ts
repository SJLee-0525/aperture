import { collectIssues, requireKoText, requireValue } from "@/lib/admin/validate-rules";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { PhotoInput } from "@/lib/supabase/photos";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validatePhotoInput = (input: PhotoInput): FieldIssue[] =>
  collectIssues(
    requireValue("image", input.image.url, "이미지를 먼저 업로드하세요."),
    requireKoText("title.ko", input.title, "제목"),
  );

export { validatePhotoInput };
