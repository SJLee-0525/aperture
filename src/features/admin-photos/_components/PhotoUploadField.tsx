"use client";

import Image from "next/image";
import { useEffect, useRef, type ChangeEvent } from "react";

import { useImageUpload, type UploadResult } from "@/features/image-upload/_hooks/use-image-upload";

import { imageThumbnailUrl, type ImageMeta } from "@/types/image";

import styles from "./PhotoUploadField.module.css";

type Props = {
  photoId: string;
  /** 현재 폼에 설정된 이미지(미리보기용) — 없으면 플레이스홀더. */
  image: ImageMeta | null;
  /** 업로드 파이프라인 성공 시 폼 자동 채움에 필요한 산출물 전달. */
  onUploaded: (result: UploadResult) => void;
  onPendingChange: (pending: boolean) => void;
};

/**
 * 이미지 업로드 필드 — 파일 선택 → EXIF 추출(압축 前)·webp 압축·Storage 업로드.
 * 산출물(image·dimensions·exif)은 onUploaded 로 상위 폼에 넘겨 자동 채움한다.
 *
 * @param {Props} props
 * @param {string} props.photoId
 * @param {ImageMeta | null} props.image - 현재 폼에 설정된 이미지(미리보기용) — 없으면 플레이스홀더.
 * @param {(result: UploadResult) => void} props.onUploaded - 업로드 파이프라인 성공 시 폼 자동 채움에 필요한 산출물 전달.
 * @param {(pending: boolean) => void} props.onPendingChange
 * @returns {JSX.Element}
 */
const PhotoUploadField = ({ photoId, image, onUploaded, onPendingChange }: Props) => {
  const { process, pending, error } = useImageUpload(photoId);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = imageThumbnailUrl(image);

  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);

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
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="업로드한 사진 미리보기"
            fill
            sizes="320px"
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
          {image?.url ? "이미지 교체" : "이미지 선택"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.input}
            disabled={pending}
            onChange={onSelect}
          />
        </label>
        <p className={styles.note}>업로드 시 EXIF 를 추출해 아래 항목을 자동으로 채웁니다.</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export { PhotoUploadField };
