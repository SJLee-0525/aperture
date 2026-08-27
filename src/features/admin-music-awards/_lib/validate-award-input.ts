import type { AwardFormValue } from "@/features/admin-music-awards/_lib/award-form-data";

const validateAwardInput = (input: AwardFormValue): string | null => {
  if (!input.name.ko.trim()) return "수상명(한국어)을 입력하세요.";
  if (!Number.isInteger(Number(input.year)) || Number(input.year) <= 0) {
    return "연도를 입력하세요.";
  }
  return null;
};

export { validateAwardInput };
