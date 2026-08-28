"use client";

import { useCallback, useState } from "react";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";
import { runLimited } from "@/features/image-upload/_lib/run-limited";
import { validateUploadableImage } from "@/features/image-upload/_lib/validate-uploadable-image";

import { getAdminImageStore } from "@/lib/admin/image-store";

import type { BatchUploadStage } from "@/features/image-upload/_lib/upload-progress";
import type { ImageMeta } from "@/types/image";

const DEV_UPLOAD_CONCURRENCY = 3;

/**
 * 개발 프로젝트 이미지 업로드 — webp 압축 → Storage(dev/{projectId}/) → ImageMeta.
 * 파일 1장 단위(process). 대표(cover)·갤러리(images) 모두 이 훅으로 올린다. EXIF 추출 없음.
 * projectId 는 문서 저장 전에 선발급된 ID(devProjects.newId) — Storage 경로 확정용.
 */
const useDevImageUpload = (projectId: string) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  const upload = useCallback(
    async (file: File): Promise<ImageMeta> => {
      const imageStore = getAdminImageStore();
      // 배치 업로드는 파일 3장을 동시에 처리한다. 원본을 각자 셋씩 디코딩하면 워커 9개가
      // 동시에 원본을 들고 있게 되므로, 메인 webp 를 만든 뒤 그것을 줄인다.
      const compressed = await compressToWebp(file);
      const [preview, thumbnail] = await Promise.all([
        compressPreviewToWebp(compressed),
        compressThumbnailToWebp(compressed),
      ]);
      const [size, previewSize, thumbnailSize, mainUpload, previewUpload, thumbnailUpload] =
        await Promise.all([
          readDimensions(compressed),
          readDimensions(preview),
          readDimensions(thumbnail),
          imageStore.uploadDevImage(projectId, compressed),
          imageStore.uploadDevPreview(projectId, preview),
          imageStore.uploadDevThumbnail(projectId, thumbnail),
        ]);
      return {
        ...mainUpload,
        ...size,
        preview: { ...previewUpload, ...previewSize },
        thumbnail: { ...thumbnailUpload, ...thumbnailSize },
      };
    },
    [projectId],
  );

  const process = useCallback(
    async (file: File): Promise<ImageMeta | null> => {
      const validationError = validateUploadableImage(file);
      if (validationError) {
        setErrors([validationError]);
        return null;
      }
      setTotal(1);
      setCompleted(0);
      setPendingCount((count) => count + 1);
      setErrors([]);
      try {
        return await upload(file);
      } catch (caught) {
        setErrors([(caught as Error).message || "이미지 처리에 실패했습니다."]);
        return null;
      } finally {
        setCompleted((done) => done + 1);
        setPendingCount((count) => count - 1);
      }
    },
    [upload],
  );

  const processBatch = useCallback(
    async (files: File[]): Promise<ImageMeta[]> => {
      if (files.length === 0) return [];
      const validationErrors = files
        .map(validateUploadableImage)
        .filter((message): message is string => !!message);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return [];
      }
      setTotal(files.length);
      setCompleted(0);
      setPendingCount((count) => count + files.length);
      setErrors([]);
      const results = await runLimited(files, DEV_UPLOAD_CONCURRENCY, async (file) => {
        try {
          return await upload(file);
        } finally {
          setCompleted((done) => done + 1);
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
    // 배치는 압축과 업로드가 파일마다 겹쳐 흘러 단계를 하나로 말할 수 없다.
    // 진행은 completed/total 이 전한다.
    // 여러 장이 겹쳐 돌아 읽기·압축을 단계로 낼 수 없다. 진행은 completed/total 이 알린다.
    stage: (pendingCount > 0 ? "uploading" : "idle") as BatchUploadStage,
    completed,
    total,
    error: errors.length > 0 ? `${errors.length}개 파일 처리 실패: ${errors[0]}` : null,
  };
};

export { useDevImageUpload };
