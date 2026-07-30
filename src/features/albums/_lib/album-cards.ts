import type { Album } from "@/types/album";
import type { LocalizedText } from "@/types/localized";
import type { Photo } from "@/types/photo";

/** 앨범 목록 카드에 필요한 최소 필드 — 전체 Photo[]를 클라이언트로 직렬화하지 않는다. */
type AlbumCard = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  coverUrl: string | null;
  count: number;
};

/**
 * 서버 투영: 커버 해석·공개 장수 집계를 렌더 전에 끝낸다.
 * 조회 구조(사진 Map)는 전체 앨범이 공유 — 앨범마다 재생성하지 않는다.
 * 커버 규칙은 resolveAlbumCover와 동일: 지정 커버가 공개 목록에 없으면 첫 공개 사진.
 */
const toAlbumCards = (albums: Album[], photos: Photo[]): AlbumCard[] => {
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));

  return albums.map((album) => {
    const memberIds = new Set(album.photoIds);
    let coverUrl: string | null = null;
    for (const photoId of [album.coverPhotoId, ...album.photoIds]) {
      if (!memberIds.has(photoId)) continue;
      const url = photoById.get(photoId)?.image.url;
      if (url) {
        coverUrl = url;
        break;
      }
    }

    return {
      id: album.id,
      title: album.title,
      subtitle: album.subtitle,
      coverUrl,
      count: album.photoIds.filter((photoId) => photoById.has(photoId)).length,
    };
  });
};

export { toAlbumCards };
export type { AlbumCard };
