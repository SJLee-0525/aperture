import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

/**
 * 공개 앨범 커버 선택.
 * 지정 커버가 공개 Photo 목록에 없으면 해당 앨범에 속한 첫 공개 Photo만 사용한다.
 */
const resolveAlbumCover = (album: Album, photos: Photo[]): string | null => {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const coverIds = [album.coverPhotoId, ...album.photoIds];

  for (const photoId of coverIds) {
    if (!album.photoIds.includes(photoId)) continue;
    const url = byId.get(photoId)?.image.url;
    if (url) return url;
  }

  return null;
};

export { resolveAlbumCover };
