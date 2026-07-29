import type { Album } from "@/types/album";

type AlbumPhotoReferences = Pick<Album, "coverPhotoId" | "photoIds">;

/** 사진 삭제 시 앨범 참조와 커버를 함께 정리한다. */
const removePhotoFromAlbum = (
  album: AlbumPhotoReferences,
  photoId: string,
): AlbumPhotoReferences => {
  const photoIds = album.photoIds.filter((id) => id !== photoId);
  const coverPhotoId = album.coverPhotoId === photoId ? (photoIds[0] ?? "") : album.coverPhotoId;

  return { coverPhotoId, photoIds };
};

export { removePhotoFromAlbum };
