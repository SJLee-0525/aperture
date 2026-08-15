"use client";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

import { listAlbumsAdmin, updateAlbum } from "@/lib/supabase/albums";
import { getAdminAccessToken } from "@/lib/supabase/auth";
import { devProjects } from "@/lib/supabase/dev";
import { musicWorks } from "@/lib/supabase/music";
import { listPhotosAdmin, updatePhoto } from "@/lib/supabase/photos";
import {
  uploadDevThumbnail,
  uploadDevPreview,
  uploadMusicPosterPreview,
  uploadMusicPosterThumbnail,
  uploadPhotoPreview,
  uploadPhotoThumbnail,
} from "@/lib/supabase/storage";

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
  completed: number;
  pending: number;
  percent: number;
  total: number;
};

type ProgressListener = (progress: MigrationProgress) => void;

type VariantUploader = (blob: Blob) => Promise<{ url: string; path: string }>;

const createVariant = async (
  file: File,
  compress: (file: File) => Promise<Blob>,
  upload: VariantUploader,
): Promise<ImageVariant> => {
  const blob = await compress(file);
  const [size, stored] = await Promise.all([readDimensions(blob), upload(blob)]);
  return { ...stored, ...size };
};

const createMissingVariants = async (
  image: ImageMeta,
  uploadPreview: VariantUploader,
  uploadThumbnail: VariantUploader,
): Promise<ImageMeta> => {
  const needsPreview = !image.preview?.url;
  const needsThumbnail = !image.thumbnail?.url;
  if (!needsPreview && !needsThumbnail) return image;

  const idToken = await getAdminAccessToken();
  if (!idToken) throw new Error("관리자 로그인이 필요합니다.");
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
    throw new Error(payload?.error || `원본 이미지를 불러오지 못했습니다. (${response.status})`);
  }
  const source = await response.blob();
  const file = new File([source], "migration-source", {
    type: source.type || "image/webp",
  });
  const [preview, thumbnail] = await Promise.all([
    needsPreview ? createVariant(file, compressPreviewToWebp, uploadPreview) : image.preview,
    needsThumbnail
      ? createVariant(file, compressThumbnailToWebp, uploadThumbnail)
      : image.thumbnail,
  ]);
  return {
    ...image,
    ...(preview ? { preview } : {}),
    ...(thumbnail ? { thumbnail } : {}),
  };
};

const needsDerivedVariants = (image: ImageMeta): boolean =>
  Boolean(image.url) && (!image.preview?.url || !image.thumbnail?.url);

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
  const result: MigrationResult = {
    albums: 0,
    devImages: 0,
    musicPosters: 0,
    photos: 0,
    completed: 0,
    pending: 0,
    percent: 100,
    total: 0,
  };
  const photoImages = new Map(photos.map((photo) => [photo.id, photo.image]));
  result.total =
    photos.filter((photo) => Boolean(photo.image.url)).length +
    works.filter((work) => Boolean(work.poster.url)).length +
    projects.reduce(
      (count, project) =>
        count + [project.cover, ...project.images].filter((image) => Boolean(image?.url)).length,
      0,
    ) +
    albums.filter((album) => photoImages.has(album.coverPhotoId)).length;

  for (const [index, photo] of photos.entries()) {
    onProgress({ stage: "사진 파생 이미지", completed: index, total: photos.length });
    if (!needsDerivedVariants(photo.image)) continue;
    result.photos += 1;
    if (dryRun) continue;
    const image = await createMissingVariants(
      photo.image,
      (blob) => uploadPhotoPreview(photo.id, blob),
      (blob) => uploadPhotoThumbnail(photo.id, blob),
    );
    const { id, ...input } = photo;
    await updatePhoto(id, { ...input, image });
    photoImages.set(id, image);
  }

  for (const [index, work] of works.entries()) {
    onProgress({ stage: "음악 포스터 파생 이미지", completed: index, total: works.length });
    if (!needsDerivedVariants(work.poster)) continue;
    result.musicPosters += 1;
    if (dryRun) continue;
    const poster = await createMissingVariants(
      work.poster,
      (blob) => uploadMusicPosterPreview(work.id, blob),
      (blob) => uploadMusicPosterThumbnail(work.id, blob),
    );
    const { id, ...input } = work;
    await musicWorks.update(id, { ...input, poster });
  }

  for (const [index, project] of projects.entries()) {
    onProgress({ stage: "개발 이미지 파생본", completed: index, total: projects.length });
    const assets = [project.cover, ...project.images].filter((image): image is ImageMeta =>
      Boolean(image),
    );
    const missingCount = assets.filter(needsDerivedVariants).length;
    result.devImages += missingCount;
    if (dryRun || missingCount === 0) continue;

    const migrate = async (image: ImageMeta): Promise<ImageMeta> =>
      !needsDerivedVariants(image)
        ? image
        : createMissingVariants(
            image,
            (blob) => uploadDevPreview(project.id, blob),
            (blob) => uploadDevThumbnail(project.id, blob),
          );
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
    const willReceiveDerived = dryRun && Boolean(cover && needsDerivedVariants(cover));
    if (
      !cover ||
      (!willReceiveDerived &&
        album.cover?.url === cover.url &&
        album.cover?.preview?.url === cover.preview?.url &&
        album.cover?.thumbnail?.url === cover.thumbnail?.url)
    )
      continue;
    result.albums += 1;
    if (dryRun) continue;
    const { id, ...input } = album;
    await updateAlbum(id, { ...input, cover });
  }

  result.pending = dryRun
    ? result.photos + result.musicPosters + result.devImages + result.albums
    : 0;
  result.completed = Math.max(0, result.total - result.pending);
  result.percent = result.total === 0 ? 100 : Math.round((result.completed / result.total) * 100);
  onProgress({ stage: "완료", completed: 1, total: 1 });
  return result;
};

export { migrateImageThumbnails };
export type { MigrationProgress, MigrationResult };
