"use client";

import { useCallback, useState } from "react";

import { uploadDevImage, uploadDevThumbnail } from "@/lib/firebase/storage";
import type { ImageMeta } from "@/types/image";

import { compressThumbnailToWebp, compressToWebp } from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";
import { runLimited } from "@/features/image-upload/_lib/run-limited";

const DEV_UPLOAD_CONCURRENCY = 3;

/**
 * 개발 프로젝트 이미지 업로드 — webp 압축 → Storage(dev/{projectId}/) → ImageMeta.
 * 파일 1장 단위(process). 대표(cover)·갤러리(images) 모두 이 훅으로 올린다. EXIF 추출 없음.
 * projectId 는 문서 저장 전에 선발급된 ID(devProjects.newId) — Storage 경로 확정용.
 */
const useDevImageUpload = (projectId: string) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const upload = useCallback(
    async (file: File): Promise<ImageMeta> => {
      const [compressed, thumbnail] = await Promise.all([
        compressToWebp(file),
        compressThumbnailToWebp(file),
      ]);
      const [size, thumbnailSize, mainUpload, thumbnailUpload] = await Promise.all([
        readDimensions(compressed),
        readDimensions(thumbnail),
        uploadDevImage(projectId, compressed),
        uploadDevThumbnail(projectId, thumbnail),
      ]);
      return {
        ...mainUpload,
        ...size,
        thumbnail: { ...thumbnailUpload, ...thumbnailSize },
      };
    },
    [projectId],
  );

  const process = useCallback(
    async (file: File): Promise<ImageMeta | null> => {
      setPendingCount((count) => count + 1);
      setErrors([]);
      try {
        return await upload(file);
      } catch (caught) {
        setErrors([(caught as Error).message || "이미지 처리에 실패했습니다."]);
        return null;
      } finally {
        setPendingCount((count) => count - 1);
      }
    },
    [upload],
  );

  const processBatch = useCallback(
    async (files: File[]): Promise<ImageMeta[]> => {
      if (files.length === 0) return [];
      setPendingCount((count) => count + files.length);
      setErrors([]);
      const results = await runLimited(files, DEV_UPLOAD_CONCURRENCY, async (file) => {
        try {
          return await upload(file);
        } finally {
          setPendingCount((count) => count - 1);
        }
      });
      const failures = results.flatMap((result) =>
        result.status === "rejected"
          ? [(result.reason as Error).message || "이미지 처리에 실패했습니다."]
          : [],
      );
      setErrors(failures);
      return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    },
    [upload],
  );

  return {
    process,
    processBatch,
    pending: pendingCount > 0,
    pendingCount,
    error: errors.length > 0 ? `${errors.length}개 파일 처리 실패: ${errors[0]}` : null,
  };
};

export { useDevImageUpload };
