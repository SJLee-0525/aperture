import { collectIssues, requireDate, requireKoText } from "@/lib/admin/validate-rules";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { MusicWorkInput } from "@/lib/supabase/music";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateWorkInput = (input: MusicWorkInput): FieldIssue[] =>
  collectIssues(
    requireKoText("title.ko", input.title, "제목"),
    requireDate("performedAt", input.performedAt, "공연 날짜"),
  );

export { validateWorkInput };
