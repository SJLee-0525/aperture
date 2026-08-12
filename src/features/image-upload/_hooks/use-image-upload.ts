"use client";

import { useCallback, useState } from "react";

import { extractExif, type ExtractedExif } from "@/lib/exif/extract";
import { getAdminImageStore } from "@/lib/admin/image-store";
import type { ImageMeta } from "@/types/image";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

/** 업로드 파이프라인 산출물 — 관리자 폼 자동 채움에 필요한 값 일체. */
type UploadResult = {
  image: ImageMeta; // 저장된 webp {url, path, w, h}
  dimensions: { w: number; h: number }; // 원본 촬영 해상도
  aspectRatio: number;
  exif: ExtractedExif;
};

/**
 * 파일 선택 → EXIF 추출(압축 前) → webp 압축 → Storage 업로드 → 산출물 반환.
 * photoId 는 문서 저장 전에 선발급된 ID(newPhotoId) — Storage 경로 확정용.
 *
 * @param {string} photoId
 * @returns {{ process: (file: File) => Promise<UploadResult | null>; pending: boolean; error: string | null }}
 */
const useImageUpload = (photoId: string) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setPending(true);
      setError(null);
      try {
        const imageStore = getAdminImageStore();
        const [exif, dimensions] = await Promise.all([
          extractExif(file), // ① 압축 前 EXIF·GPS
          readDimensions(file), // ② 원본 크기
        ]);
        const [compressed, preview, thumbnail] = await Promise.all([
          compressToWebp(file),
          compressPreviewToWebp(file),
          compressThumbnailToWebp(file),
        ]); // ③ 메인·카드용 프리뷰·작은 썸네일 webp 병렬 압축
        const [stored, previewSize, thumbnailSize, mainUpload, previewUpload, thumbnailUpload] =
          await Promise.all([
            readDimensions(compressed),
            readDimensions(preview),
            readDimensions(thumbnail),
            imageStore.uploadPhotoImage(photoId, compressed),
            imageStore.uploadPhotoPreview(photoId, preview),
            imageStore.uploadPhotoThumbnail(photoId, thumbnail),
          ]); // ④ 크기 확인과 세 이미지 업로드 병렬 실행
        return {
          image: {
            ...mainUpload,
            w: stored.w,
            h: stored.h,
            preview: { ...previewUpload, w: previewSize.w, h: previewSize.h },
            thumbnail: { ...thumbnailUpload, w: thumbnailSize.w, h: thumbnailSize.h },
          },
          dimensions,
          aspectRatio: dimensions.h > 0 ? dimensions.w / dimensions.h : 1,
          exif,
        };
      } catch (caught) {
        setError((caught as Error).message || "이미지 처리에 실패했습니다.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [photoId],
  );

  return { process, pending, error };
};

export { useImageUpload };
export type { UploadResult };
