"use client";

import { useCallback, useState } from "react";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

import { getAdminImageStore } from "@/lib/admin/image-store";
import { extractExif, type ExtractedExif } from "@/lib/exif/extract";

import type { ImageMeta } from "@/types/image";

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
        // ③ 메인 webp 를 먼저 만들고 그것을 줄여 프리뷰·썸네일을 얻는다.
        // 원본을 셋이 각자 디코딩하면 4천만 화소 사진에서 메모리가 세 배로 늘어,
        // 모바일 Safari 가 탭을 종료하면서 업로드가 실패한다.
        const compressed = await compressToWebp(file);
        const [preview, thumbnail] = await Promise.all([
          compressPreviewToWebp(compressed),
          compressThumbnailToWebp(compressed),
        ]);
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
