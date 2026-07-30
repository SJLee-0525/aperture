import type { ImageMeta } from "@/types/image";
import type { Photo } from "@/types/photo";

type GalleryPhoto = Pick<
  Photo,
  "id" | "title" | "camera" | "lens" | "place" | "tags" | "aspectRatio"
> & {
  image: ImageMeta;
  exif: Pick<Photo["exif"], "aperture" | "shutter" | "iso" | "focalLength">;
};

const toGalleryPhotos = (photos: Photo[]): GalleryPhoto[] =>
  photos.map((photo) => ({
    id: photo.id,
    title: photo.title,
    camera: photo.camera,
    lens: photo.lens,
    place: photo.place,
    tags: photo.tags,
    aspectRatio: photo.aspectRatio,
    image: photo.image,
    exif: {
      aperture: photo.exif.aperture,
      shutter: photo.exif.shutter,
      iso: photo.exif.iso,
      focalLength: photo.exif.focalLength,
    },
  }));

export { toGalleryPhotos };
export type { GalleryPhoto };
