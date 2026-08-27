import { collectIssues, requireKoText } from "@/lib/admin/validate-rules";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { MusicMediaInput } from "@/lib/supabase/music";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateMediaInput = (input: MusicMediaInput): FieldIssue[] =>
  collectIssues(requireKoText("title.ko", input.title, "제목"));

export { validateMediaInput };
