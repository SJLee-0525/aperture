import type { PhotoInput } from "@/lib/supabase/photos";

const validatePhotoInput = (input: PhotoInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  if (!input.image.url) return "이미지를 먼저 업로드하세요.";
  return null;
};

export { validatePhotoInput };
