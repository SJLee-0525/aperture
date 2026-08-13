import { imageThumbnailUrl } from "@/types/image";

import type { Coords } from "@/types/coords";
import type { LocalizedText } from "@/types/localized";
import type { Photo } from "@/types/photo";

type MapLocation = {
  id: string;
  coords: Coords;
  place: LocalizedText;
  thumbnailUrl: string;
};

const toMapLocations = (photos: Photo[]): MapLocation[] =>
  photos.flatMap((photo) =>
    photo.coords
      ? [
          {
            id: photo.id,
            coords: photo.coords,
            place: photo.place,
            thumbnailUrl: imageThumbnailUrl(photo.image),
          },
        ]
      : [],
  );

export { toMapLocations };
export type { MapLocation };
