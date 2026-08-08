import type { Album } from "@/types/album";

type AlbumPhotoReferences = Pick<Album, "coverPhotoId" | "photoIds">;

/**
 * 사진 삭제 시 앨범 참조와 커버를 함께 정리한다.
 *
 * @param {AlbumPhotoReferences} album 현재 앨범의 커버와 사진 ID 목록.
 * @param {string} photoId 참조에서 제거할 사진 ID.
 * @returns {AlbumPhotoReferences} 사진 ID와 필요하면 커버까지 교체한 참조.
 */
const removePhotoFromAlbum = (
  album: AlbumPhotoReferences,
  photoId: string,
): AlbumPhotoReferences => {
  const photoIds = album.photoIds.filter((id) => id !== photoId);
  const coverPhotoId = album.coverPhotoId === photoId ? (photoIds[0] ?? "") : album.coverPhotoId;

  return { coverPhotoId, photoIds };
};

export { removePhotoFromAlbum };
