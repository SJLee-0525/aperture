import type { AwardFormValue } from "@/features/admin-music-awards/_lib/award-form-data";
import type { FieldIssue } from "@/lib/admin/field-issue";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateAwardInput = (input: AwardFormValue): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  const year = Number(input.year);
  if (!input.year.trim() || !Number.isInteger(year) || year <= 0) {
    issues.push({ field: "year", message: "연도를 입력하세요." });
  }
  if (!input.name.ko.trim()) {
    issues.push({ field: "name.ko", message: "수상명(한국어)을 입력하세요." });
  }
  return issues;
};

export { validateAwardInput };
