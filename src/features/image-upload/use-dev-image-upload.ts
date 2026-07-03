"use client";

import { useCallback, useState } from "react";

import { uploadDevImage } from "@/lib/firebase/storage";
import type { ImageMeta } from "@/types/image";

import { compressToWebp } from "./compress";
import { readDimensions } from "./read-dimensions";

/**
 * 개발 프로젝트 이미지 업로드 — webp 압축 → Storage(dev/{projectId}/) → ImageMeta.
 * 파일 1장 단위(process). 대표(cover)·갤러리(images) 모두 이 훅으로 올린다. EXIF 추출 없음.
 * projectId 는 문서 저장 전에 선발급된 ID(devProjects.newId) — Storage 경로 확정용.
 */
const useDevImageUpload = (projectId: string) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<ImageMeta | null> => {
      setPending(true);
      setError(null);
      try {
        const compressed = await compressToWebp(file);
        const { w, h } = await readDimensions(compressed);
        const { url, path } = await uploadDevImage(projectId, compressed);
        return { url, path, w, h };
      } catch (caught) {
        setError((caught as Error).message || "이미지 처리에 실패했습니다.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [projectId],
  );

  return { process, pending, error };
};

export { useDevImageUpload };
