"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ROUTES } from "@/constants/routes";
import type { MusicAward } from "@/types/music";

import { musicAwards, type MusicAwardInput } from "@/lib/firebase/music";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";
import styles from "./AwardForm.module.css";

type Props = {
  awardId: string;
  /** 있으면 수정 모드. */
  initial?: MusicAward;
};

/** 빈 수상 초기 상태. */
const emptyInput = (): MusicAwardInput => ({
  year: new Date().getFullYear(),
  name: EMPTY_TEXT,
  place: "",
  description: EMPTY_TEXT,
  // 새 수상은 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다.
  order: 0,
  published: false,
});

const fromAward = (award: MusicAward): MusicAwardInput => {
  const { id: _id, ...rest } = award;
  void _id;
  return rest;
};

/** 공유 수상 폼 — 연도·이중언어 이름·장소·설명 + 저장. */
const AwardForm = ({ awardId, initial }: Props) => {
  const router = useRouter();
  const isEdit = initial != null;

  const [form, setForm] = useState<MusicAwardInput>(() =>
    initial ? fromAward(initial) : emptyInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<MusicAwardInput>) => setForm((prev) => ({ ...prev, ...next }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.ko.trim()) {
      setError("수상명(한국어)을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await musicAwards.update(awardId, form);
      } else {
        await musicAwards.create(awardId, form);
      }
      router.replace(ROUTES.ADMIN_MUSIC_AWARDS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "수상 수정" : "새 수상"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>연도 · 장소</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>연도</span>
            <input
              type="number"
              className={styles.input}
              value={form.year}
              onChange={(e) => patch({ year: Number(e.target.value) })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>장소 (예: Geneva, CH)</span>
            <input
              className={styles.input}
              value={form.place}
              onChange={(e) => patch({ place: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>수상명</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>수상명 (한국어) *</span>
            <input
              className={styles.input}
              value={form.name.ko}
              onChange={(e) => patch({ name: { ...form.name, ko: e.target.value } })}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>수상명 (English)</span>
            <input
              className={styles.input}
              value={form.name.en}
              onChange={(e) => patch({ name: { ...form.name, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>설명</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>설명 (한국어)</span>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.description.ko}
              onChange={(e) => patch({ description: { ...form.description, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>설명 (English)</span>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.description.en}
              onChange={(e) => patch({ description: { ...form.description, en: e.target.value } })}
            />
          </label>
        </div>
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
          {saving ? "저장 중…" : isEdit ? "수정 저장" : "수상 저장"}
        </button>
        <button
          type="button"
          className={styles.cancel}
          onClick={() => router.replace(ROUTES.ADMIN_MUSIC_AWARDS)}
          disabled={saving}
        >
          취소
        </button>
      </div>
    </form>
  );
};

export { AwardForm };
