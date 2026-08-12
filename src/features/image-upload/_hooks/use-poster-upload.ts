"use client";

import { useCallback, useState } from "react";

import { getAdminImageStore } from "@/lib/admin/image-store";
import type { ImageMeta } from "@/types/image";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

/**
 * 음악 포스터 업로드 — webp 압축 → Storage(music/{workId}/) → ImageMeta 반환.
 * 사진 파이프라인(use-image-upload)과 달리 **EXIF·좌표 추출이 없다**(포스터는 촬영정보 불필요).
 * workId 는 문서 저장 전에 선발급된 ID(musicWorks.newId) — Storage 경로 확정용.
 *
 * @param {string} workId
 * @returns {{ process: (file: File) => Promise<ImageMeta | null>; pending: boolean; error: string | null }}
 */
const usePosterUpload = (workId: string) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<ImageMeta | null> => {
      setPending(true);
      setError(null);
      try {
        const imageStore = getAdminImageStore();
        const [compressed, preview, thumbnail] = await Promise.all([
          compressToWebp(file),
          compressPreviewToWebp(file),
          compressThumbnailToWebp(file),
        ]);
        const [size, previewSize, thumbnailSize, mainUpload, previewUpload, thumbnailUpload] =
          await Promise.all([
            readDimensions(compressed),
            readDimensions(preview),
            readDimensions(thumbnail),
            imageStore.uploadMusicPoster(workId, compressed),
            imageStore.uploadMusicPosterPreview(workId, preview),
            imageStore.uploadMusicPosterThumbnail(workId, thumbnail),
          ]);
        return {
          ...mainUpload,
          ...size,
          preview: { ...previewUpload, ...previewSize },
          thumbnail: { ...thumbnailUpload, ...thumbnailSize },
        };
      } catch (caught) {
        setError((caught as Error).message || "이미지 처리에 실패했습니다.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [workId],
  );

  return { process, pending, error };
};

export { usePosterUpload };
