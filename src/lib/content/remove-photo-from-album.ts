import type { Album } from "@/types/album";

type AlbumPhotoReferences = Pick<Album, "cover" | "coverPhotoId" | "photoIds">;

/**
 * 사진 삭제 시 앨범 참조와 커버를 함께 정리한다.
 *
 * `cover` 는 관리자 목록과 챗 참조 카드가 쓰는 이미지 스냅샷이다. 커버 사진이 삭제되면
 * Storage 객체도 함께 지워지므로 이 스냅샷을 비워야 죽은 URL 이 화면에 남지 않는다.
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
  const removedCover = album.coverPhotoId === photoId;
  const coverPhotoId = removedCover ? (photoIds[0] ?? "") : album.coverPhotoId;
  // 새 커버의 스냅샷은 여기서 만들 수 없다(사진 이미지가 인자에 없다). 죽은 URL 을
  // 남기지 않도록 비우면 관리자 목록이 다음 저장에서 다시 채운다.
  const cover = removedCover ? null : album.cover;

  return { cover, coverPhotoId, photoIds };
};

export { removePhotoFromAlbum };
