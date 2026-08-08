"use client";

import { useState, type FormEvent } from "react";

import type { Tag } from "@/types/tag";

import styles from "./TagAddForm.module.css";

type Props = {
  /** 추가 시도 — 실패하면 한국어 사유 문자열, 성공하면 null 을 반환. */
  onAdd: (draft: Tag) => string | null;
};

const EMPTY: Tag = { id: "", ko: "", en: "" };

/**
 * 새 태그 추가 폼 — id(영문 슬러그) + ko + en. 검증은 상위 훅(onAdd)이 담당.
 *
 * @param {Props} props
 * @param {(draft: Tag) => string | null} props.onAdd - 추가 시도 — 실패하면 한국어 사유 문자열, 성공하면 null 을 반환.
 * @returns {JSX.Element}
 */
const TagAddForm = ({ onAdd }: Props) => {
  const [draft, setDraft] = useState<Tag>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const reason = onAdd(draft);
    if (reason) {
      setError(reason);
      return;
    }
    setDraft(EMPTY);
    setError(null);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>id (영문 슬러그) *</span>
          <input
            className={styles.input}
            value={draft.id}
            placeholder="street"
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>한국어</span>
          <input
            className={styles.input}
            value={draft.ko}
            placeholder="거리"
            onChange={(e) => setDraft((d) => ({ ...d, ko: e.target.value }))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>English</span>
          <input
            className={styles.input}
            value={draft.en}
            placeholder="Street"
            onChange={(e) => setDraft((d) => ({ ...d, en: e.target.value }))}
          />
        </label>
        <button type="submit" className={styles.add}>
          + 추가
        </button>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
};

export { TagAddForm };
