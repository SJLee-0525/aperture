import type { DevProjectInput } from "@/lib/supabase/dev";

const validateProjectInput = (input: DevProjectInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  return null;
};

export { validateProjectInput };
