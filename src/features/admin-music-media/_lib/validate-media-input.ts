import type { MusicMediaInput } from "@/lib/supabase/music";

const validateMediaInput = (input: MusicMediaInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  return null;
};

export { validateMediaInput };
