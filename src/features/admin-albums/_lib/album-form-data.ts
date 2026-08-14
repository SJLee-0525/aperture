import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { AlbumInput } from "@/lib/firebase/albums";
import type { Album } from "@/types/album";

const emptyAlbumInput = (): AlbumInput => ({
  title: EMPTY_TEXT,
  subtitle: EMPTY_TEXT,
  coverPhotoId: "",
  cover: null,
  photoIds: [],
  order: 0,
  published: false,
});

const albumToInput = (album: Album): AlbumInput => {
  const { id: _id, ...input } = album;
  void _id;
  return input;
};

const normalizeAlbumInput = (input: AlbumInput): AlbumInput => ({
  ...input,
  coverPhotoId: input.photoIds.includes(input.coverPhotoId)
    ? input.coverPhotoId
    : (input.photoIds[0] ?? ""),
});

const validateAlbumInput = (input: AlbumInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  if (input.photoIds.length === 0) return "앨범에 넣을 사진을 최소 한 장 이상 선택하세요.";
  return null;
};

export { albumToInput, emptyAlbumInput, normalizeAlbumInput, validateAlbumInput };
