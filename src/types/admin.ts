import type { Album } from "@/types/album";
import type { DevProject } from "@/types/dev";
import type { DevArticle } from "@/types/dev-article";
import type { MusicWork } from "@/types/music";
import type { Photo } from "@/types/photo";

type AdminPhotoListItem = Pick<Photo, "id" | "title" | "image" | "order" | "published">;
type AdminAlbumListItem = Pick<
  Album,
  "id" | "title" | "coverPhotoId" | "cover" | "photoIds" | "order" | "published"
>;
type AdminDevProjectListItem = Pick<
  DevProject,
  "id" | "title" | "year" | "cover" | "order" | "published"
>;
type AdminMusicWorkListItem = Pick<
  MusicWork,
  "id" | "title" | "performedAt" | "poster" | "order" | "published"
>;
/**
 * 블로그 목록 행. Markdown `body` 와 이미지 metadata 를 뺀 것이 요점이다 —
 * 글 하나가 수십 KB라 목록에서 전부 읽으면 관리자 첫 화면이 그만큼 느려진다.
 * 본문은 편집 화면이 문서 한 건을 읽을 때만 가져온다.
 */
type AdminDevArticleListItem = Pick<
  DevArticle,
  "id" | "slug" | "title" | "tags" | "pinned" | "published" | "publishedAt" | "updatedAt"
>;

export type {
  AdminAlbumListItem,
  AdminDevArticleListItem,
  AdminDevProjectListItem,
  AdminMusicWorkListItem,
  AdminPhotoListItem,
};
