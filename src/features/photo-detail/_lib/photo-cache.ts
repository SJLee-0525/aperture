import type { Photo } from "@/types/photo";

const PHOTO_CACHE_LIMIT = 9;

const mergePhotoCache = (
  current: ReadonlyMap<string, Photo>,
  incoming: Photo[],
  limit = PHOTO_CACHE_LIMIT,
): Map<string, Photo> => {
  const next = new Map(current);

  for (const photo of incoming) {
    next.delete(photo.id);
    next.set(photo.id, photo);
  }

  while (next.size > limit) {
    const oldestId = next.keys().next().value;
    if (oldestId == null) break;
    next.delete(oldestId);
  }

  return next;
};

export { mergePhotoCache };
