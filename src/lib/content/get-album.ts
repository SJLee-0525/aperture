import { MOCK_ALBUMS } from "@/mocks/albums";
import type { Album } from "@/types/album";

/** 단일 앨범 (공개된 것만). 없으면 null. ★ P2에서 Firestore로 교체. */
const getAlbum = async (id: string): Promise<Album | null> =>
  MOCK_ALBUMS.find((album) => album.id === id && album.published) ?? null;

export { getAlbum };
