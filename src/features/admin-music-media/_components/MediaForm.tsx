"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";
import styles from "@/features/admin-shell/_components/admin-form.module.css";
import { RecoveryNotice } from "@/features/admin-shell/_components/RecoveryNotice";

import { useMediaEditor } from "@/features/admin-music-media/_hooks/use-media-editor";

import { issueFor } from "@/lib/admin/field-issue";

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
  const { recovery, applyForm, form, issues, formRef, isEdit, error, saving, patch, cancel, submit } = useMediaEditor(
    mediaId,
    initial,
  );

  return (
    <form className={styles.form} ref={formRef} onSubmit={submit} noValidate>
      {recovery.pending ? (
        <RecoveryNotice
          savedAt={recovery.pending.savedAt}
          onRestore={() => {
            const restored = recovery.restore();
            if (restored) applyForm(restored);
          }}
          onDiscard={recovery.discard}
        />
      ) : null}

      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "영상 수정" : "새 영상"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>제목</h2>
        <LocalizedFieldPair
          label="제목"
          value={form.title}
          onChange={(next) => patch({ title: next })}
          required
          field="title"
          error={issueFor(issues, "title.ko")}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>출처</h2>
        <LocalizedFieldPair
          label="출처"
          value={form.source}
          onChange={(next) => patch({ source: next })}
          placeholder={{ ko: "예술의전당 실황 · 2025", en: "Live at Seoul Arts Center · 2025" }}
        />
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
