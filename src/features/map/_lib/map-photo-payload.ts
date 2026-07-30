import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

type SerializedPhoto = Omit<Photo, "shotAt"> & { shotAt: string };

type MapPhotoPayload = {
  photos: SerializedPhoto[];
  tags: Tag[];
};

const adjacentPhotos = (photos: Photo[], id: string): Photo[] => {
  const index = photos.findIndex((photo) => photo.id === id);
  if (index < 0) return [];

  const indexes =
    photos.length > 1
      ? [(index - 1 + photos.length) % photos.length, index, (index + 1) % photos.length]
      : [index];

  return indexes
    .filter((photoIndex, position, items) => items.indexOf(photoIndex) === position)
    .map((photoIndex) => photos[photoIndex]);
};

const serializePhoto = (photo: Photo): SerializedPhoto => ({
  ...photo,
  shotAt: photo.shotAt.toISOString(),
});

const revivePhoto = (photo: SerializedPhoto): Photo => ({
  ...photo,
  shotAt: new Date(photo.shotAt),
});

export { adjacentPhotos, revivePhoto, serializePhoto };
export type { MapPhotoPayload };
