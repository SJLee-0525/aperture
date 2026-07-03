"use client";

import { useCallback, useState } from "react";

import { uploadMusicPoster } from "@/lib/firebase/storage";
import type { ImageMeta } from "@/types/image";

import { compressToWebp } from "./compress";
import { readDimensions } from "./read-dimensions";

/**
 * 음악 포스터 업로드 — webp 압축 → Storage(music/{workId}/) → ImageMeta 반환.
 * 사진 파이프라인(use-image-upload)과 달리 **EXIF·좌표 추출이 없다**(포스터는 촬영정보 불필요).
 * workId 는 문서 저장 전에 선발급된 ID(musicWorks.newId) — Storage 경로 확정용.
 */
const usePosterUpload = (workId: string) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<ImageMeta | null> => {
      setPending(true);
      setError(null);
      try {
        const compressed = await compressToWebp(file);
        const { w, h } = await readDimensions(compressed);
        const { url, path } = await uploadMusicPoster(workId, compressed);
        return { url, path, w, h };
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
