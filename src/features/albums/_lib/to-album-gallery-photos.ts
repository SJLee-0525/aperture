import { toGalleryPhotos } from "@/types/gallery-photo";

import type { Album } from "@/types/album";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Photo } from "@/types/photo";

/**
 * 앨범이 나열한 순서대로 사진을 뽑아 그리드가 쓰는 필드만 남긴다.
 * 앨범 안의 사진 순서는 관리자가 정한 `photoIds` 배열이 단일 출처다.
 *
 * 비공개로 바뀌었거나 삭제된 id 는 조용히 빠진다. 공개 목록에 없는 사진을 앨범이
 * 가리키는 상태는 정상이며, 상세도 열 수 없으므로 그리드에도 두지 않는다.
 */
const toAlbumGalleryPhotos = (album: Album, photos: Photo[]): GalleryPhoto[] => {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const ordered = album.photoIds
    .map((photoId) => byId.get(photoId))
    .filter((photo): photo is Photo => photo != null);

  return toGalleryPhotos(ordered);
};

export { toAlbumGalleryPhotos };
