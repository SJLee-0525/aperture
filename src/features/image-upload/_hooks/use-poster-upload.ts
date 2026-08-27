"use client";

import { useCallback, useState } from "react";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";
import { checkUploadSize } from "@/features/image-upload/_lib/upload-progress";

import { getAdminImageStore } from "@/lib/admin/image-store";

import type { UploadStage } from "@/features/image-upload/_lib/upload-progress";
import type { ImageMeta } from "@/types/image";

/**
 * 음악 포스터 업로드 — webp 압축 → Storage(music/{workId}/) → ImageMeta 반환.
 * 사진 파이프라인(use-image-upload)과 달리 **EXIF·좌표 추출이 없다**(포스터는 촬영정보 불필요).
 * workId 는 문서 저장 전에 선발급된 ID(musicWorks.newId) — Storage 경로 확정용.
 *
 * @param {string} workId
 * @returns {{ process: (file: File) => Promise<ImageMeta | null>; pending: boolean; stage: UploadStage; completed: number; total: number; error: string | null }}
 */
const usePosterUpload = (workId: string) => {
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<ImageMeta | null> => {
      const tooLarge = checkUploadSize(file);
      if (tooLarge) {
        setError(tooLarge);
        return null;
      }
      setPending(true);
      setStage("compressing");
      setError(null);
      try {
        const imageStore = getAdminImageStore();
        // 원본을 셋이 각자 디코딩하지 않도록 메인 webp 를 만든 뒤 그것을 줄인다.
        const compressed = await compressToWebp(file);
        const [preview, thumbnail] = await Promise.all([
          compressPreviewToWebp(compressed),
          compressThumbnailToWebp(compressed),
        ]);
        setStage("uploading");
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
        setStage("idle");
      }
    },
    [workId],
  );

  return { process, pending, stage, completed: 0, total: 0, error };
};

export { usePosterUpload };
