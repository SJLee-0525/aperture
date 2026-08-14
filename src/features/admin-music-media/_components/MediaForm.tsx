"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { ROUTES } from "@/constants/routes";
import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { MusicMediaInput } from "@/lib/firebase/music";
import type { MusicMedia } from "@/types/music";

import styles from "./MediaForm.module.css";

type Props = {
  mediaId: string;
  /** 있으면 수정 모드. */
  initial?: MusicMedia;
};

/**
 * 빈 영상 초기 상태.
 *
 * @returns {MusicMediaInput}
 */
const emptyInput = (): MusicMediaInput => ({
  title: EMPTY_TEXT,
  source: EMPTY_TEXT,
  youtubeId: "",
  // 새 영상은 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다.
  order: 0,
  published: false,
});

const fromMedia = (media: MusicMedia): MusicMediaInput => {
  const { id: _id, ...rest } = media;
  void _id;
  return rest;
};

/**
 * 공유 영상 폼 — 이중언어 제목·출처 + YouTube ID + 저장.
 *
 * @param {Props} props
 * @param {string} props.mediaId
 * @param {MusicMedia | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const MediaForm = ({ mediaId, initial }: Props) => {
  const router = useRouter();
  const isEdit = initial != null;

  const [form, setForm] = useState<MusicMediaInput>(() =>
    initial ? fromMedia(initial) : emptyInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<MusicMediaInput>) => setForm((prev) => ({ ...prev, ...next }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.title.ko.trim()) {
      setError("제목(한국어)을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      const mediaRepository = getMusicMediaRepository();
      if (isEdit) {
        await mediaRepository.update(mediaId, form);
      } else {
        await mediaRepository.create(mediaId, form);
      }
      router.replace(ROUTES.ADMIN_MUSIC_MEDIA);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "영상 수정" : "새 영상"}</h1>
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
        <h2 className={styles.legend}>출처</h2>
        <div className={styles.grid2}>
          <AdminField label="출처 (한국어)">
            <AdminInput
              value={form.source.ko}
              placeholder="예술의전당 실황 · 2025"
              onChange={(e) => patch({ source: { ...form.source, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="출처 (English)">
            <AdminInput
              value={form.source.en}
              placeholder="Live at Seoul Arts Center · 2025"
              onChange={(e) => patch({ source: { ...form.source, en: e.target.value } })}
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
            onChange={(e) => patch({ youtubeId: e.target.value })}
          />
        </AdminField>
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
        <AdminButton
          variant="secondary"
          onClick={() => router.replace(ROUTES.ADMIN_MUSIC_MEDIA)}
          disabled={saving}
        >
          취소
        </AdminButton>
      </div>
    </form>
  );
};

export { MediaForm };
