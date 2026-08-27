"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";

import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import { imagePreviewUrl } from "@/types/image";

import type { ArticleCoverUploader } from "@/features/admin-dev-articles/_lib/article-image-uploader";
import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

import styles from "./ArticleForm.module.css";

type Props = {
  form: DevArticleInput;
  upload: ArticleCoverUploader;
  onPatch: (next: Partial<DevArticleInput>) => void;
};

/**
 * 대표 이미지와 그 대체 텍스트.
 *
 * 대체 텍스트에는 제목을 되풀이하지 않고 이미지 자체를 설명한다(계획 §2). 목록 카드와 상세
 * hero 가 같은 값을 쓰므로 한 번만 적는다. 이미지를 지우면 폼이 대체 텍스트도 함께 비운다.
 *
 * @param {Props} props
 * @param {DevArticleInput} props.form 현재 폼 값.
 * @param {ArticleCoverUploader} props.upload 주입받은 업로더. mock 단계에서는 fixture 주소를 준다.
 * @param {(next: Partial<DevArticleInput>) => void} props.onPatch 폼 일부를 갱신한다.
 * @returns {JSX.Element}
 */
const ArticleCoverField = ({ form, upload, onPatch }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverAlt = form.coverAlt ?? EMPTY_TEXT;

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 change 가 오도록 값을 비운다.
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      onPatch({ cover: await upload(file) });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.legend}>대표 이미지</h2>

      <div className={styles.cover}>
        <span className={styles.coverPreview}>
          {form.cover ? (
            <Image
              src={imagePreviewUrl(form.cover)}
              alt=""
              fill
              sizes="160px"
              className={styles.coverImg}
            />
          ) : null}
        </span>

        <div className={styles.coverSide}>
          <div className={styles.inlineForm}>
            <AdminButton
              variant="secondary"
              size="xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "업로드 중…" : form.cover ? "이미지 교체" : "+ 이미지 선택"}
            </AdminButton>
            {form.cover ? (
              <button
                type="button"
                className={styles.remove}
                onClick={() => onPatch({ cover: null, coverAlt: null })}
              >
                이미지 삭제
              </button>
            ) : null}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
          </div>

          <LocalizedFieldPair
            label="대체 텍스트"
            value={coverAlt}
            onChange={(next) => onPatch({ coverAlt: next })}
            disabled={!form.cover}
          />

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export { ArticleCoverField };
