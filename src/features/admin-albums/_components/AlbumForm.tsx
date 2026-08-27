"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import styles from "@/features/admin-shell/_components/admin-form.module.css";

import { useAlbumEditor } from "@/features/admin-albums/_hooks/use-album-editor";

import type { Album } from "@/types/album";

import { AlbumPhotoPicker } from "./AlbumPhotoPicker";

type Props = {
  albumId: string;
  /** 있으면 수정 모드. */
  initial?: Album;
};

/**
 * 공유 앨범 폼 — 이중언어 제목·부제 + 사진 선택/순서/커버 + 저장.
 *
 * @param {Props} props
 * @param {string} props.albumId
 * @param {Album | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const AlbumForm = ({ albumId, initial }: Props) => {
  const {
    cancel,
    error,
    form,
    isEdit,
    patch,
    photoError,
    photos,
    photoStatus,
    reorderPhotos,
    saving,
    selectedPhotoIds,
    setCover,
    submit,
    togglePhoto,
  } = useAlbumEditor(albumId, initial);

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "앨범 수정" : "새 앨범"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>제목</h2>
        <div className={styles.grid2}>
          <AdminField label="제목 (한국어)" required>
            <AdminInput
              value={form.title.ko}
              onChange={(e) => patch({ title: { ...form.title, ko: e.target.value } })}
              required
            />
          </AdminField>
          <AdminField label="제목 (English)">
            <AdminInput
              value={form.title.en}
              onChange={(e) => patch({ title: { ...form.title, en: e.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>부제</h2>
        <div className={styles.grid2}>
          <AdminField label="부제 (한국어)">
            <AdminInput
              value={form.subtitle.ko}
              onChange={(e) => patch({ subtitle: { ...form.subtitle, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="부제 (English)">
            <AdminInput
              value={form.subtitle.en}
              onChange={(e) => patch({ subtitle: { ...form.subtitle, en: e.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>사진 · 순서 · 커버</h2>
        <AlbumPhotoPicker
          photos={photos}
          status={photoStatus}
          error={photoError}
          photoIds={selectedPhotoIds}
          coverPhotoId={form.coverPhotoId}
          onToggle={togglePhoto}
          onReorder={reorderPhotos}
          onSetCover={setCover}
        />
      </section>

      <section className={styles.section}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>공개 (방문자에게 표시)</span>
        </label>
      </section>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <AdminButton variant="primary" type="submit" disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </AdminButton>
        <AdminButton variant="secondary" onClick={cancel} disabled={saving}>
          취소
        </AdminButton>
      </div>
    </form>
  );
};

export { AlbumForm };
