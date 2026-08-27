import type { MusicWorkInput } from "@/lib/supabase/music";

const validateWorkInput = (input: MusicWorkInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  return null;
};

export { validateWorkInput };
