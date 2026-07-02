"use client";

import { useCallback, useState } from "react";

import { extractExif, type ExtractedExif } from "@/lib/exif/extract";
import { uploadPhotoImage } from "@/lib/firebase/storage";
import type { ImageMeta } from "@/types/image";

import { compressToWebp } from "./compress";
import { readDimensions } from "./read-dimensions";

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
 */
const useImageUpload = (photoId: string) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setPending(true);
      setError(null);
      try {
        const exif = await extractExif(file); // ① 압축 前 EXIF·GPS
        const dimensions = await readDimensions(file); // ② 원본 크기
        const compressed = await compressToWebp(file); // ③ webp 압축
        const stored = await readDimensions(compressed); // 저장본 크기
        const { url, path } = await uploadPhotoImage(photoId, compressed); // ④ 업로드
        return {
          image: { url, path, w: stored.w, h: stored.h },
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
