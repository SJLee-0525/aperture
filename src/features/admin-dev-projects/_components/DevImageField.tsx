"use client";

import Image from "next/image";
import { useEffect, useRef, type ChangeEvent } from "react";

import { useDevImageUpload } from "@/features/image-upload/_hooks/use-dev-image-upload";
import { imageThumbnailUrl, type ImageMeta } from "@/types/image";

import styles from "./DevImageField.module.css";

type Props = {
  projectId: string;
  /** 목록 대표 이미지 — 없으면 플레이스홀더. */
  cover: ImageMeta | null;
  /** 상세 모달 갤러리 이미지들. */
  images: ImageMeta[];
  onCoverChange: (cover: ImageMeta | null) => void;
  onImagesChange: (images: ImageMeta[]) => void;
  onPendingChange: (pending: boolean) => void;
};

/**
 * 개발 프로젝트 이미지 필드 — 대표(cover) 1장 + 갤러리(images) 여러 장.
 * cover·gallery 모두 useDevImageUpload(projectId) 로 webp 압축 후 Storage 업로드.
 *
 * @param {Props} props
 * @param {string} props.projectId
 * @param {ImageMeta | null} props.cover - 목록 대표 이미지 — 없으면 플레이스홀더.
 * @param {ImageMeta[]} props.images - 상세 모달 갤러리 이미지들.
 * @param {(cover: ImageMeta | null) => void} props.onCoverChange
 * @param {(images: ImageMeta[]) => void} props.onImagesChange
 * @param {(pending: boolean) => void} props.onPendingChange
 * @returns {JSX.Element}
 */
const DevImageField = ({
  projectId,
  cover,
  images,
  onCoverChange,
  onImagesChange,
  onPendingChange,
}: Props) => {
  const { process, processBatch, pending, pendingCount, error } = useDevImageUpload(projectId);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewUrl = imageThumbnailUrl(cover);

  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);

  const onCoverSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const result = await process(file);
      if (result) onCoverChange(result);
    }
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const onGallerySelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const added = await processBatch(files);
    if (added.length > 0) onImagesChange([...images, ...added]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const removeImage = (index: number) => onImagesChange(images.filter((_, i) => i !== index));

  const moveImage = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onImagesChange(next);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.coverBlock}>
        <div className={styles.preview}>
          {coverPreviewUrl ? (
            <Image
              src={coverPreviewUrl}
              alt="대표 이미지 미리보기"
              fill
              sizes="240px"
              className={styles.previewImg}
            />
          ) : (
            <span className={styles.placeholder}>대표 이미지</span>
          )}
        </div>
        <div className={styles.controls}>
          <label className={styles.button}>
            {cover?.url ? "대표 교체" : "대표 선택"}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className={styles.input}
              disabled={pending}
              onChange={onCoverSelect}
            />
          </label>
          {cover?.url ? (
            <button
              type="button"
              className={styles.remove}
              disabled={pending}
              onClick={() => onCoverChange(null)}
            >
              대표 제거
            </button>
          ) : null}
          <p className={styles.note}>목록 카드에 쓰이는 대표 이미지입니다. (webp 압축)</p>
        </div>
      </div>

      <div className={styles.galleryBlock}>
        <div className={styles.galleryHead}>
          <span className={styles.subLabel}>갤러리 (상세 모달)</span>
          <label className={styles.button}>
            + 이미지 추가
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.input}
              disabled={pending}
              onChange={onGallerySelect}
            />
          </label>
        </div>

        {images.length === 0 ? (
          <p className={styles.note}>아직 갤러리 이미지가 없습니다.</p>
        ) : (
          <ul className={styles.thumbs}>
            {images.map((image, index) => (
              <li key={image.path || index} className={styles.thumbItem}>
                <span className={styles.thumb}>
                  <Image
                    src={imageThumbnailUrl(image)}
                    alt={`갤러리 이미지 ${index + 1}`}
                    fill
                    sizes="120px"
                    className={styles.thumbImg}
                  />
                </span>
                <div className={styles.thumbControls}>
                  <button
                    type="button"
                    className={styles.move}
                    aria-label="앞으로"
                    disabled={pending || index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.move}
                    aria-label="뒤로"
                    disabled={pending || index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    disabled={pending}
                    onClick={() => removeImage(index)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending ? (
        <p className={styles.note} aria-live="polite">
          이미지 처리 중… 남은 파일 {pendingCount}개
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export { DevImageField };
