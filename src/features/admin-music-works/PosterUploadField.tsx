"use client";

import Image from "next/image";
import { useRef, type ChangeEvent } from "react";

import { usePosterUpload } from "@/features/image-upload/use-poster-upload";
import type { ImageMeta } from "@/types/image";

import styles from "./PosterUploadField.module.css";

type Props = {
  workId: string;
  /** 현재 폼에 설정된 포스터(미리보기용) — 없으면 플레이스홀더. */
  poster: ImageMeta | null;
  /** 업로드 성공 시 폼에 반영할 ImageMeta 전달. */
  onUploaded: (poster: ImageMeta) => void;
};

/**
 * 연주 포스터 업로드 필드 — 파일 선택 → webp 압축 → Storage(music/{workId}/) 업로드.
 * 사진과 달리 EXIF 추출은 없다(usePosterUpload).
 */
const PosterUploadField = ({ workId, poster, onUploaded }: Props) => {
  const { process, pending, error } = usePosterUpload(workId);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await process(file);
    if (result) onUploaded(result);
    // 같은 파일 재선택 허용.
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={styles.field}>
      <div className={styles.preview}>
        {poster?.url ? (
          <Image
            src={poster.url}
            alt="업로드한 포스터 미리보기"
            fill
            sizes="180px"
            className={styles.previewImg}
          />
        ) : (
          <span className={styles.placeholder}>미리보기</span>
        )}
        {pending ? (
          <span className={styles.pending}>
            <span className={styles.spinner} aria-hidden="true" />
            처리 중…
          </span>
        ) : null}
      </div>

      <div className={styles.controls}>
        <label className={styles.button}>
          {poster?.url ? "포스터 교체" : "포스터 선택"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.input}
            disabled={pending}
            onChange={onSelect}
          />
        </label>
        <p className={styles.note}>포스터 이미지를 업로드합니다. (webp 압축)</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export { PosterUploadField };
