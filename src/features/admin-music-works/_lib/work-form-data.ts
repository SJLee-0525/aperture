import { withoutId } from "@/lib/admin/without-id";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";
import { normalizePublicHref } from "@/lib/security/public-url";

import type { MusicWorkInput } from "@/lib/supabase/music";
import type { MusicWork } from "@/types/music";

/** epoch 는 디코더가 "값 없음"에 쓰는 표현이라 빈 입력란으로 그린다. */
const toDateValue = (date: Date): string => {
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** 빈 입력은 epoch 로 돌려준다. toDateValue 가 그것을 다시 빈 칸으로 그린다. */
const fromDateValue = (value: string): Date => {
  if (!value) return new Date(0);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const emptyWorkInput = (): MusicWorkInput => ({
  title: EMPTY_TEXT,
  subtitle: EMPTY_TEXT,
  performedAt: new Date(),
  time: "",
  venue: EMPTY_TEXT,
  category: EMPTY_TEXT,
  program: [],
  description: EMPTY_TEXT,
  poster: { url: "", path: "", w: 0, h: 0 },
  ticketUrl: "",
  order: 0,
  published: false,
});

const workToInput = (work: MusicWork): MusicWorkInput => withoutId(work);

const prepareWorkInput = (form: MusicWorkInput): MusicWorkInput => {
  const ticketUrl = form.ticketUrl.trim();
  const safeTicketUrl = normalizePublicHref(ticketUrl);
  if (ticketUrl && !safeTicketUrl) {
    throw new Error("예매 링크는 HTTPS 또는 사이트 내부 주소만 사용할 수 있습니다.");
  }
  return {
    ...form,
    ticketUrl: safeTicketUrl,
    program: form.program.map((piece) => piece.trim()).filter(Boolean),
  };
};

export { emptyWorkInput, fromDateValue, prepareWorkInput, toDateValue, workToInput };
