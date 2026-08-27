"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";
import base from "@/features/admin-shell/_components/admin-form.module.css";

import { useWorkEditor } from "@/features/admin-music-works/_hooks/use-work-editor";

import { fromDateValue, toDateValue } from "@/features/admin-music-works/_lib/work-form-data";

import type { MusicWork } from "@/types/music";

import { PosterUploadField } from "./PosterUploadField";
import styles from "./WorkForm.module.css";

type Props = {
  workId: string;
  /** 있으면 수정 모드. */
  initial?: MusicWork;
};

/**
 * 공유 연주 폼 — 이중언어 필드 + 일시·프로그램·포스터·예매 + 저장.
 *
 * @param {Props} props
 * @param {string} props.workId
 * @param {MusicWork | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const WorkForm = ({ workId, initial }: Props) => {
  const {
    form,
    isEdit,
    error,
    saving,
    uploading,
    patch,
    addProgram,
    editProgram,
    removeProgram,
    onPosterChange,
    onUploadPendingChange,
    cancel,
    submit,
  } = useWorkEditor(workId, initial);

  return (
    <form className={base.form} onSubmit={submit} noValidate>
      <header className={base.head}>
        <h1 className={base.title}>{isEdit ? "연주 수정" : "새 연주"}</h1>
      </header>

      <section className={base.section}>
        <h2 className={base.legend}>제목</h2>
        <LocalizedFieldPair
          label="제목"
          value={form.title}
          onChange={(next) => patch({ title: next })}
          required
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>부제 (작곡가 · 작품번호)</h2>
        <LocalizedFieldPair
          label="부제"
          value={form.subtitle}
          onChange={(next) => patch({ subtitle: next })}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>일시</h2>
        <div className={base.grid2}>
          <AdminField label="공연 날짜">
            <AdminInput
              type="date"
              value={toDateValue(form.performedAt)}
              onChange={(e) =>
                e.target.value ? patch({ performedAt: fromDateValue(e.target.value) }) : null
              }
            />
          </AdminField>
          <AdminField label="시각">
            <AdminInput
              value={form.time}
              placeholder="19:30"
              onChange={(e) => patch({ time: e.target.value })}
            />
          </AdminField>
        </div>
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>장소</h2>
        <LocalizedFieldPair
          label="장소"
          value={form.venue}
          onChange={(next) => patch({ venue: next })}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>분류 (리사이틀 · 협연 · 갈라)</h2>
        <LocalizedFieldPair
          label="분류"
          value={form.category}
          onChange={(next) => patch({ category: next })}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>설명</h2>
        <LocalizedFieldPair
          label="설명"
          value={form.description}
          onChange={(next) => patch({ description: next })}
          multiline
          rows={4}
        />
      </section>

      <section className={base.section}>
        <div className={styles.arrayHead}>
          <h2 className={base.legend}>프로그램 (곡명 · 언어 무관)</h2>
          <AdminButton variant="secondary" size="xs" onClick={addProgram}>
            + 곡 추가
          </AdminButton>
        </div>
        {form.program.length === 0 ? (
          <p className={styles.note}>아직 곡이 없습니다.</p>
        ) : (
          <ul className={styles.programList}>
            {form.program.map((piece, index) => (
              <li key={index} className={styles.programRow}>
                <AdminInput
                  className={styles.programInput}
                  aria-label={`곡명 ${index + 1}`}
                  value={piece}
                  onChange={(event) => editProgram(index, event.target.value)}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeProgram(index)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>포스터</h2>
        <PosterUploadField
          workId={workId}
          poster={form.poster.url ? form.poster : null}
          onChange={onPosterChange}
          onPendingChange={onUploadPendingChange}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>예매</h2>
        <AdminField label="예매 링크">
          <AdminInput
            value={form.ticketUrl}
            placeholder="https://…"
            onChange={(e) => patch({ ticketUrl: e.target.value })}
          />
        </AdminField>
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

      {error ? (
        <p className={base.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={base.actions}>
        <AdminButton variant="primary" type="submit" disabled={saving || uploading}>
          {saving ? "저장 중…" : "저장"}
        </AdminButton>
        <AdminButton variant="secondary" onClick={cancel} disabled={saving || uploading}>
          취소
        </AdminButton>
      </div>
    </form>
  );
};

export { WorkForm };
