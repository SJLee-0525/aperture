import type { Album } from "@/types/album";
import type { DevProject } from "@/types/dev";
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

export type {
  AdminAlbumListItem,
  AdminDevProjectListItem,
  AdminMusicWorkListItem,
  AdminPhotoListItem,
};
