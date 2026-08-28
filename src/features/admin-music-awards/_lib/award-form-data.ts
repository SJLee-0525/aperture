import { withoutId } from "@/lib/admin/without-id";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { MusicAwardInput } from "@/lib/supabase/music";
import type { MusicAward } from "@/types/music";

/** 폼이 다루는 수상 입력. year 는 빈 칸을 표현해야 해서 문자열로 둔다. */
type AwardFormValue = Omit<MusicAwardInput, "year"> & { year: string };

const emptyAwardInput = (): AwardFormValue => ({
  year: String(new Date().getFullYear()),
  name: EMPTY_TEXT,
  place: "",
  description: EMPTY_TEXT,
  // 새 수상은 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다.
  order: 0,
  published: false,
});

const awardToInput = (award: MusicAward): AwardFormValue => {
  const { year, ...rest } = withoutId(award);
  return { ...rest, year: year ? String(year) : "" };
};

const prepareAwardInput = (form: AwardFormValue): MusicAwardInput => ({
  ...form,
  year: Number(form.year),
  place: form.place.trim(),
});

export { awardToInput, emptyAwardInput, prepareAwardInput };
export type { AwardFormValue };
