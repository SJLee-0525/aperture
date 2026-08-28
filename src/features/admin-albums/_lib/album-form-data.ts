import { withoutId } from "@/lib/admin/without-id";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { AlbumInput } from "@/lib/supabase/albums";
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

const albumToInput = (album: Album): AlbumInput => withoutId(album);

const prepareAlbumInput = (input: AlbumInput): AlbumInput => ({
  ...input,
  coverPhotoId: input.photoIds.includes(input.coverPhotoId)
    ? input.coverPhotoId
    : (input.photoIds[0] ?? ""),
});

export { albumToInput, emptyAlbumInput, prepareAlbumInput };
