"use client";

import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";
import base from "@/features/admin-shell/_components/admin-form.module.css";
import { AdminFormShell } from "@/features/admin-shell/_components/AdminFormShell";

import { useAlbumEditor } from "@/features/admin-albums/_hooks/use-album-editor";

import { issueFor } from "@/lib/admin/field-issue";

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
 * @param props.initial - 있으면 수정 모드.
 */
const AlbumForm = ({ albumId, initial }: Props) => {
  const {
    recovery,
    applyForm,
    cancel,
    error,
    formRef,
    issues,
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
    <AdminFormShell
      title={isEdit ? "앨범 수정" : "새 앨범"}
      formRef={formRef}
      onSubmit={submit}
      onCancel={cancel}
      busy={saving}
      saving={saving}
      error={error}
      recovery={recovery}
      onRestore={(restored) => applyForm(restored as typeof form)}
    >

      <section className={base.section}>
        <h2 className={base.legend}>제목</h2>
        <LocalizedFieldPair
          label="제목"
          value={form.title}
          onChange={(next) => patch({ title: next })}
          required
          field="title"
          error={issueFor(issues, "title.ko")}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>부제</h2>
        <LocalizedFieldPair
          label="부제"
          value={form.subtitle}
          onChange={(next) => patch({ subtitle: next })}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>사진 · 순서 · 커버</h2>
        <AlbumPhotoPicker
          photos={photos}
          status={photoStatus}
          error={photoError}
          photoIds={selectedPhotoIds}
          coverPhotoId={form.coverPhotoId}
          onToggle={togglePhoto}
          onReorder={reorderPhotos}
          onSetCover={setCover}
          field="photoIds"
          validationError={issueFor(issues, "photoIds")}
        />
      </section>

      <section className={base.section}>
        <label className={base.checkbox}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>공개 (방문자에게 표시)</span>
        </label>
      </section>

    </AdminFormShell>
  );
};

export { AlbumForm };
