import { imagePreviewUrl, type ImageMeta } from "@/types/image";

import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

/**
 * 공개 앨범 커버 선택.
 * 지정 커버가 공개 Photo 목록에 없으면 해당 앨범에 속한 첫 공개 Photo만 사용한다.
 */
const resolveAlbumCoverImage = (album: Album, photos: Photo[]): ImageMeta | null => {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const coverIds = [album.coverPhotoId, ...album.photoIds];

  for (const photoId of coverIds) {
    if (!album.photoIds.includes(photoId)) continue;
    const image = byId.get(photoId)?.image;
    if (image?.url) return image;
  }

  return null;
};

const resolveAlbumCover = (album: Album, photos: Photo[]): string | null =>
  resolveAlbumCoverImage(album, photos)?.url ?? null;

/**
 * 화면용 앨범 커버는 320px 썸네일을 우선하고 구형 데이터만 메인 이미지로 폴백한다.
 */
const resolveAlbumCoverPreview = (album: Album, photos: Photo[]): string | null =>
  imagePreviewUrl(resolveAlbumCoverImage(album, photos)) || null;

/**
 * 공개 사진 목록에 실제로 남아 있는 앨범 사진 수.
 */
const countVisibleAlbumPhotos = (album: Album, photos: Photo[]): number => {
  const visibleIds = new Set(photos.map((photo) => photo.id));
  return album.photoIds.filter((photoId) => visibleIds.has(photoId)).length;
};

export { countVisibleAlbumPhotos, resolveAlbumCover, resolveAlbumCoverPreview };
