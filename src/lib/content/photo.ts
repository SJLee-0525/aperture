import { shouldUseMockContent } from "@/lib/content/content-source";
import { publishedInOrder } from "@/lib/content/mock-list";
import { fetchPublishedAlbums, fetchPublishedPhotos } from "@/lib/supabase/public/photo";

import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

const getPhotos = async (): Promise<Photo[]> => {
  if (!shouldUseMockContent()) return fetchPublishedPhotos();
  const { MOCK_PHOTOS } = await import("@/mocks/photos");
  return publishedInOrder(MOCK_PHOTOS);
};

const getAlbums = async (): Promise<Album[]> => {
  if (!shouldUseMockContent()) return fetchPublishedAlbums();
  const { MOCK_ALBUMS } = await import("@/mocks/albums");
  return publishedInOrder(MOCK_ALBUMS);
};

const getAlbum = async (id: string): Promise<Album | null> =>
  (await getAlbums()).find((album) => album.id === id) ?? null;

const getTags = async (): Promise<Tag[]> => {
  const { getSite } = await import("@/lib/content/site");
  return (await getSite()).tags;
};

export { getAlbum, getAlbums, getPhotos, getTags };
