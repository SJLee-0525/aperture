import type { AlbumInput } from "@/lib/supabase/albums";

const validateAlbumInput = (input: AlbumInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  if (input.photoIds.length === 0) return "앨범에 넣을 사진을 최소 한 장 이상 선택하세요.";
  return null;
};

export { validateAlbumInput };
