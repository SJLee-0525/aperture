import type { FieldIssue } from "@/lib/admin/field-issue";
import type { MusicWorkInput } from "@/lib/supabase/music";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateWorkInput = (input: MusicWorkInput): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  if (!input.title.ko.trim()) {
    issues.push({ field: "title.ko", message: "제목(한국어)을 입력하세요." });
  }
  // epoch 는 디코더와 폼이 "값 없음"에 쓰는 표현이다. 목록 정렬이 이 값을 기준으로 한다.
  if (input.performedAt.getTime() === 0 || Number.isNaN(input.performedAt.getTime())) {
    issues.push({ field: "performedAt", message: "공연 날짜를 입력하세요." });
  }
  return issues;
};

export { validateWorkInput };
