"use client";

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
    <form className={styles.form} onSubmit={submit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "연주 수정" : "새 연주"}</h1>
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
        <h2 className={styles.legend}>부제 (작곡가 · 작품번호)</h2>
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
        <h2 className={styles.legend}>일시</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>공연 날짜</span>
            <input
              type="date"
              className={styles.input}
              value={toDateValue(form.performedAt)}
              onChange={(e) =>
                e.target.value ? patch({ performedAt: fromDateValue(e.target.value) }) : null
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>시각 (예: 19:30)</span>
            <input
              className={styles.input}
              value={form.time}
              placeholder="19:30"
              onChange={(e) => patch({ time: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>장소</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>장소 (한국어)</span>
            <input
              className={styles.input}
              value={form.venue.ko}
              onChange={(e) => patch({ venue: { ...form.venue, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>장소 (English)</span>
            <input
              className={styles.input}
              value={form.venue.en}
              onChange={(e) => patch({ venue: { ...form.venue, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>구분 (리사이틀 · 협연 · 갈라)</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>구분 (한국어)</span>
            <input
              className={styles.input}
              value={form.category.ko}
              onChange={(e) => patch({ category: { ...form.category, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>구분 (English)</span>
            <input
              className={styles.input}
              value={form.category.en}
              onChange={(e) => patch({ category: { ...form.category, en: e.target.value } })}
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
        <div className={styles.arrayHead}>
          <h2 className={styles.legend}>프로그램 (곡명)</h2>
          <button type="button" className={styles.add} onClick={addProgram}>
            + 곡 추가
          </button>
        </div>
        {form.program.length === 0 ? (
          <p className={styles.note}>아직 곡이 없습니다.</p>
        ) : (
          <ul className={styles.programList}>
            {form.program.map((piece, index) => (
              <li key={index} className={styles.programRow}>
                <input
                  className={styles.input}
                  value={piece}
                  placeholder="곡명 (언어 무관)"
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

      <section className={styles.section}>
        <h2 className={styles.legend}>포스터</h2>
        <PosterUploadField
          workId={workId}
          poster={form.poster.url ? form.poster : null}
          onChange={onPosterChange}
          onPendingChange={onUploadPendingChange}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>예매</h2>
        <label className={styles.field}>
          <span className={styles.label}>예매 링크</span>
          <input
            className={styles.input}
            value={form.ticketUrl}
            placeholder="https://…"
            onChange={(e) => patch({ ticketUrl: e.target.value })}
          />
        </label>
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
        <button type="submit" className={styles.submit} disabled={saving || uploading}>
          {saving ? "저장 중…" : isEdit ? "수정 저장" : "연주 저장"}
        </button>
        <button
          type="button"
          className={styles.cancel}
          onClick={cancel}
          disabled={saving || uploading}
        >
          취소
        </button>
      </div>
    </form>
  );
};

export { WorkForm };
