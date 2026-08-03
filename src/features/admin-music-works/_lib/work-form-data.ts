import type { MusicWorkInput } from "@/lib/firebase/music";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { MusicWork } from "@/types/music";

const toDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateValue = (value: string): Date => {
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

const workToInput = (work: MusicWork): MusicWorkInput => {
  const { id: _id, ...input } = work;
  void _id;
  return input;
};

const prepareWorkInput = (form: MusicWorkInput): MusicWorkInput => ({
  ...form,
  program: form.program.map((piece) => piece.trim()).filter(Boolean),
});

export { emptyWorkInput, fromDateValue, prepareWorkInput, toDateValue, workToInput };
