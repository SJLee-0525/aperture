"use client";

import { compressThumbnailToWebp } from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";
import { listAlbumsAdmin, updateAlbum } from "@/lib/firebase/albums";
import { devProjects } from "@/lib/firebase/dev";
import { listPhotosAdmin, updatePhoto } from "@/lib/firebase/firestore";
import { musicWorks } from "@/lib/firebase/music";
import { auth } from "@/lib/firebase/client";
import {
  uploadDevThumbnail,
  uploadMusicPosterThumbnail,
  uploadPhotoThumbnail,
} from "@/lib/firebase/storage";
import type { ImageMeta, ImageVariant } from "@/types/image";

type MigrationProgress = {
  stage: string;
  completed: number;
  total: number;
};

type MigrationResult = {
  albums: number;
  devImages: number;
  musicPosters: number;
  photos: number;
};

type ProgressListener = (progress: MigrationProgress) => void;

const createThumbnail = async (
  image: ImageMeta,
  upload: (blob: Blob) => Promise<{ url: string; path: string }>,
): Promise<ImageVariant> => {
  const user = auth.currentUser;
  if (!user) throw new Error("관리자 로그인이 필요합니다.");
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/image-source", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: image.url }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `원본 이미지 다운로드 실패 (${response.status})`);
  }
  const source = await response.blob();
  const file = new File([source], "migration-source", {
    type: source.type || "image/webp",
  });
  const thumbnail = await compressThumbnailToWebp(file);
  const [size, stored] = await Promise.all([readDimensions(thumbnail), upload(thumbnail)]);
  return { ...stored, ...size };
};

const migrateImageThumbnails = async (
  dryRun: boolean,
  onProgress: ProgressListener = () => undefined,
): Promise<MigrationResult> => {
  const [photos, albums, works, projects] = await Promise.all([
    listPhotosAdmin(),
    listAlbumsAdmin(),
    musicWorks.list(),
    devProjects.list(),
  ]);
  const result: MigrationResult = { albums: 0, devImages: 0, musicPosters: 0, photos: 0 };
  const photoImages = new Map(photos.map((photo) => [photo.id, photo.image]));

  for (const [index, photo] of photos.entries()) {
    onProgress({ stage: "사진 썸네일", completed: index, total: photos.length });
    if (photo.image.thumbnail?.url || !photo.image.url) continue;
    result.photos += 1;
    if (dryRun) continue;
    const thumbnail = await createThumbnail(photo.image, (blob) =>
      uploadPhotoThumbnail(photo.id, blob),
    );
    const image = { ...photo.image, thumbnail };
    const { id, ...input } = photo;
    await updatePhoto(id, { ...input, image });
    photoImages.set(id, image);
  }

  for (const [index, work] of works.entries()) {
    onProgress({ stage: "음악 포스터 썸네일", completed: index, total: works.length });
    if (work.poster.thumbnail?.url || !work.poster.url) continue;
    result.musicPosters += 1;
    if (dryRun) continue;
    const thumbnail = await createThumbnail(work.poster, (blob) =>
      uploadMusicPosterThumbnail(work.id, blob),
    );
    const { id, ...input } = work;
    await musicWorks.update(id, { ...input, poster: { ...work.poster, thumbnail } });
  }

  for (const [index, project] of projects.entries()) {
    onProgress({ stage: "개발 이미지 썸네일", completed: index, total: projects.length });
    const assets = [project.cover, ...project.images].filter((image): image is ImageMeta =>
      Boolean(image),
    );
    const missingCount = assets.filter((image) => image.url && !image.thumbnail?.url).length;
    result.devImages += missingCount;
    if (dryRun || missingCount === 0) continue;

    const migrate = async (image: ImageMeta): Promise<ImageMeta> =>
      image.thumbnail?.url || !image.url
        ? image
        : {
            ...image,
            thumbnail: await createThumbnail(image, (blob) => uploadDevThumbnail(project.id, blob)),
          };
    const [cover, ...images] = await Promise.all([
      project.cover ? migrate(project.cover) : Promise.resolve(null),
      ...project.images.map(migrate),
    ]);
    const { id, ...input } = project;
    await devProjects.update(id, { ...input, cover, images });
  }

  for (const [index, album] of albums.entries()) {
    onProgress({ stage: "앨범 커버", completed: index, total: albums.length });
    const cover = photoImages.get(album.coverPhotoId) ?? null;
    const willReceiveThumbnail = dryRun && Boolean(cover?.url) && !cover?.thumbnail?.url;
    if (
      !cover ||
      (!willReceiveThumbnail &&
        album.cover?.url === cover.url &&
        album.cover?.thumbnail?.url === cover.thumbnail?.url)
    )
      continue;
    result.albums += 1;
    if (dryRun) continue;
    const { id, ...input } = album;
    await updateAlbum(id, { ...input, cover });
  }

  onProgress({ stage: "완료", completed: 1, total: 1 });
  return result;
};

export { migrateImageThumbnails };
export type { MigrationProgress, MigrationResult };
