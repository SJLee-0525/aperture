"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ROUTES } from "@/constants/routes";
import { createAlbum, updateAlbum, type AlbumInput } from "@/lib/firebase/albums";
import type { Album } from "@/types/album";

import { AlbumPhotoPicker } from "./AlbumPhotoPicker";
import styles from "./AlbumForm.module.css";

type Props = {
  albumId: string;
  /** 있으면 수정 모드. */
  initial?: Album;
};

/** Album → 편집용 초기 상태(AlbumInput 형태). initial 없으면 빈 앨범. */
const emptyInput = (): AlbumInput => ({
  title: { ko: "", en: "" },
  subtitle: { ko: "", en: "" },
  coverPhotoId: "",
  photoIds: [],
  // 새 앨범은 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다.
  order: 0,
  published: false,
});

const fromAlbum = (album: Album): AlbumInput => {
  const { id: _id, ...rest } = album;
  void _id;
  return rest;
};

/** 공유 앨범 폼 — 이중언어 제목·부제 + 사진 선택/순서/커버 + 저장. */
const AlbumForm = ({ albumId, initial }: Props) => {
  const router = useRouter();
  const isEdit = initial != null;

  const [form, setForm] = useState<AlbumInput>(() => (initial ? fromAlbum(initial) : emptyInput()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<AlbumInput>) => setForm((prev) => ({ ...prev, ...next }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.title.ko.trim()) {
      setError("제목(한국어)을 입력하세요.");
      return;
    }
    if (form.photoIds.length === 0) {
      setError("앨범에 넣을 사진을 최소 한 장 이상 선택하세요.");
      return;
    }

    // 커버가 비어 있거나 선택에서 빠졌으면 첫 사진으로 보정.
    const coverPhotoId = form.photoIds.includes(form.coverPhotoId)
      ? form.coverPhotoId
      : form.photoIds[0];

    const input: AlbumInput = { ...form, coverPhotoId };

    setSaving(true);
    try {
      if (isEdit) {
        await updateAlbum(albumId, input);
      } else {
        await createAlbum(albumId, input);
      }
      router.replace(ROUTES.ADMIN_ALBUMS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "앨범 수정" : "새 앨범"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>제목</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>제목 (한국어) *</span>
            <input
              className={styles.input}
              value={form.title.ko}
              onChange={(e) => patch({ title: { ...form.title, ko: e.target.value } })}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>제목 (English)</span>
            <input
              className={styles.input}
              value={form.title.en}
              onChange={(e) => patch({ title: { ...form.title, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>부제</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>부제 (한국어)</span>
            <input
              className={styles.input}
              value={form.subtitle.ko}
              onChange={(e) => patch({ subtitle: { ...form.subtitle, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>부제 (English)</span>
            <input
              className={styles.input}
              value={form.subtitle.en}
              onChange={(e) => patch({ subtitle: { ...form.subtitle, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>사진 · 순서 · 커버</h2>
        <AlbumPhotoPicker
          photoIds={form.photoIds}
          coverPhotoId={form.coverPhotoId}
          onChangePhotoIds={(photoIds) => patch({ photoIds })}
          onChangeCover={(coverPhotoId) => patch({ coverPhotoId })}
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
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "저장 중…" : isEdit ? "수정 저장" : "앨범 저장"}
        </button>
        <button
          type="button"
          className={styles.cancel}
          onClick={() => router.replace(ROUTES.ADMIN_ALBUMS)}
          disabled={saving}
        >
          취소
        </button>
      </div>
    </form>
  );
};

export { AlbumForm };
