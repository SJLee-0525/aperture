"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { ROUTES } from "@/constants/routes";
import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { MusicAwardInput } from "@/lib/supabase/music";
import type { MusicAward } from "@/types/music";

import styles from "./AwardForm.module.css";

type Props = {
  awardId: string;
  /** 있으면 수정 모드. */
  initial?: MusicAward;
};

/**
 * 빈 수상 초기 상태.
 *
 * @returns {MusicAwardInput}
 */
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

/**
 * 공유 수상 폼 — 연도·이중언어 이름·장소·설명 + 저장.
 *
 * @param {Props} props
 * @param {string} props.awardId
 * @param {MusicAward | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
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
      const awardRepository = getMusicAwardRepository();
      if (isEdit) {
        await awardRepository.update(awardId, form);
      } else {
        await awardRepository.create(awardId, form);
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
          <AdminField label="연도">
            <AdminInput
              type="number"
              value={form.year}
              onChange={(e) => patch({ year: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="장소">
            <AdminInput
              value={form.place}
              placeholder="Geneva, CH"
              onChange={(e) => patch({ place: e.target.value })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>수상명</h2>
        <div className={styles.grid2}>
          <AdminField label="수상명 (한국어)" required>
            <AdminInput
              value={form.name.ko}
              onChange={(e) => patch({ name: { ...form.name, ko: e.target.value } })}
              required
            />
          </AdminField>
          <AdminField label="수상명 (English)">
            <AdminInput
              value={form.name.en}
              onChange={(e) => patch({ name: { ...form.name, en: e.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>설명</h2>
        <div className={styles.grid2}>
          <AdminField label="설명 (한국어)">
            <AdminInput
              multiline
              rows={4}
              value={form.description.ko}
              onChange={(e) => patch({ description: { ...form.description, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="설명 (English)">
            <AdminInput
              multiline
              rows={4}
              value={form.description.en}
              onChange={(e) => patch({ description: { ...form.description, en: e.target.value } })}
            />
          </AdminField>
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
        <AdminButton variant="primary" type="submit" disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </AdminButton>
        <AdminButton
          variant="secondary"
          onClick={() => router.replace(ROUTES.ADMIN_MUSIC_AWARDS)}
          disabled={saving}
        >
          취소
        </AdminButton>
      </div>
    </form>
  );
};

export { AwardForm };
