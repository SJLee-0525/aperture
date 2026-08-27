import { collectIssues, requireKoText, requireYear } from "@/lib/admin/validate-rules";

import type { AwardFormValue } from "@/features/admin-music-awards/_lib/award-form-data";
import type { FieldIssue } from "@/lib/admin/field-issue";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateAwardInput = (input: AwardFormValue): FieldIssue[] =>
  collectIssues(
    requireYear("year", input.year, "연도"),
    requireKoText("name.ko", input.name, "수상명"),
  );

export { validateAwardInput };
