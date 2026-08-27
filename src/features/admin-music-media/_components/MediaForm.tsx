"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import styles from "@/features/admin-shell/_components/admin-form.module.css";

import { useMediaEditor } from "@/features/admin-music-media/_hooks/use-media-editor";


import type { MusicMedia } from "@/types/music";

type Props = {
  mediaId: string;
  /** 있으면 수정 모드. */
  initial?: MusicMedia;
};

/**
 * 공유 영상 폼 — 이중언어 제목·출처 + YouTube ID + 저장. 조립만 하고 상태는 훅이 갖는다.
 *
 * @param {Props} props
 * @param {string} props.mediaId
 * @param {MusicMedia | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const MediaForm = ({ mediaId, initial }: Props) => {
  const { form, isEdit, error, saving, patch, cancel, submit } = useMediaEditor(mediaId, initial);

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "영상 수정" : "새 영상"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>제목</h2>
        <div className={styles.grid2}>
          <AdminField label="제목 (한국어)" required>
            <AdminInput
              value={form.title.ko}
              onChange={(event) => patch({ title: { ...form.title, ko: event.target.value } })}
              required
            />
          </AdminField>
          <AdminField label="제목 (English)">
            <AdminInput
              value={form.title.en}
              onChange={(event) => patch({ title: { ...form.title, en: event.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>출처</h2>
        <div className={styles.grid2}>
          <AdminField label="출처 (한국어)">
            <AdminInput
              value={form.source.ko}
              placeholder="예술의전당 실황 · 2025"
              onChange={(event) => patch({ source: { ...form.source, ko: event.target.value } })}
            />
          </AdminField>
          <AdminField label="출처 (English)">
            <AdminInput
              value={form.source.en}
              placeholder="Live at Seoul Arts Center · 2025"
              onChange={(event) => patch({ source: { ...form.source, en: event.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>YouTube</h2>
        <AdminField label="YouTube 영상 ID">
          <AdminInput
            value={form.youtubeId}
            placeholder="dQw4w9WgXcQ"
            onChange={(event) => patch({ youtubeId: event.target.value })}
          />
        </AdminField>
      </section>

      <section className={styles.section}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => patch({ published: event.target.checked })}
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

export { MediaForm };
