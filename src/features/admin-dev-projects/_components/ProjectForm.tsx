"use client";

import { CloseIcon } from "@/components/CloseIcon";

import { useProjectEditor } from "@/features/admin-dev-projects/_hooks/use-project-editor";

import type { DevProject } from "@/types/dev";

import { DevImageField } from "./DevImageField";
import { LocalizedProjectListField } from "./LocalizedProjectListField";
import styles from "./ProjectForm.module.css";
import { TroubleshootingField } from "./TroubleshootingField";

type Props = {
  projectId: string;
  /** 있으면 수정 모드. */
  initial?: DevProject;
};

/**
 * 공유 프로젝트 폼 — 이중언어 필드 + 담당·트러블슈팅·기술·링크·이미지 + 저장.
 *
 * @param {Props} props
 * @param {string} props.projectId
 * @param {DevProject | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const ProjectForm = ({ projectId, initial }: Props) => {
  const {
    form,
    isEdit,
    tagDraft,
    setTagDraft,
    error,
    saving,
    uploading,
    patch,
    addLocalized,
    editLocalized,
    removeLocalized,
    addTag,
    onTagKeyDown,
    removeTag,
    addLink,
    editLink,
    removeLink,
    onCoverChange,
    onImagesChange,
    onUploadPendingChange,
    cancel,
    submit,
  } = useProjectEditor(projectId, initial);

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "프로젝트 수정" : "새 프로젝트"}</h1>
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
        <h2 className={styles.legend}>분류 · 연도</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>분류 (한국어)</span>
            <input
              className={styles.input}
              value={form.category.ko}
              placeholder="SSAFY 관통 프로젝트"
              onChange={(e) => patch({ category: { ...form.category, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>분류 (English)</span>
            <input
              className={styles.input}
              value={form.category.en}
              onChange={(e) => patch({ category: { ...form.category, en: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>연도</span>
            <input
              className={styles.input}
              value={form.year}
              placeholder="2025"
              onChange={(e) => patch({ year: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>기간 · 포지션</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>기간 (한국어)</span>
            <input
              className={styles.input}
              value={form.period.ko}
              placeholder="2025. 12. — 현재"
              onChange={(e) => patch({ period: { ...form.period, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>기간 (English)</span>
            <input
              className={styles.input}
              value={form.period.en}
              placeholder="Dec 2025 — Present"
              onChange={(e) => patch({ period: { ...form.period, en: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>포지션 (한국어)</span>
            <input
              className={styles.input}
              value={form.position.ko}
              placeholder="Frontend 전체 · 6인 팀 (FE 1 · BE 2 · AI 3)"
              onChange={(e) => patch({ position: { ...form.position, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>포지션 (English)</span>
            <input
              className={styles.input}
              value={form.position.en}
              placeholder="Sole frontend engineer · team of 6"
              onChange={(e) => patch({ position: { ...form.position, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>요약 (카드 한 줄)</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>요약 (한국어)</span>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.summary.ko}
              onChange={(e) => patch({ summary: { ...form.summary, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>요약 (English)</span>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.summary.en}
              onChange={(e) => patch({ summary: { ...form.summary, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>개요</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>개요 (한국어)</span>
            <textarea
              className={styles.textarea}
              rows={5}
              value={form.overview.ko}
              onChange={(e) => patch({ overview: { ...form.overview, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>개요 (English)</span>
            <textarea
              className={styles.textarea}
              rows={5}
              value={form.overview.en}
              onChange={(e) => patch({ overview: { ...form.overview, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <LocalizedProjectListField
        field="features"
        legend="주요 기능"
        items={form.features}
        onAdd={addLocalized}
        onEdit={editLocalized}
        onRemove={removeLocalized}
      />
      <LocalizedProjectListField
        field="roles"
        legend="담당 · 주요 작업"
        items={form.roles}
        onAdd={addLocalized}
        onEdit={editLocalized}
        onRemove={removeLocalized}
      />

      <section className={styles.section}>
        <h2 className={styles.legend}>트러블슈팅</h2>
        <TroubleshootingField
          entries={form.troubleshooting}
          onChange={(troubleshooting) => patch({ troubleshooting })}
        />
      </section>

      <LocalizedProjectListField
        field="achievements"
        legend="성과 · 수상"
        items={form.achievements}
        onAdd={addLocalized}
        onEdit={editLocalized}
        onRemove={removeLocalized}
      />

      <section className={styles.section}>
        <div className={styles.arrayHead}>
          <h2 className={styles.legend}>기술 스택 (태그)</h2>
        </div>
        <div className={styles.tagInputRow}>
          <input
            className={styles.input}
            value={tagDraft}
            placeholder="기술명 입력 후 Enter (예: React)"
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKeyDown}
          />
          <button type="button" className={styles.add} onClick={addTag}>
            + 추가
          </button>
        </div>
        {form.techTags.length > 0 ? (
          <ul className={styles.chips}>
            {form.techTags.map((tag) => (
              <li key={tag} className={styles.chip}>
                <span>{tag}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`${tag} 삭제`}
                  onClick={() => removeTag(tag)}
                >
                  <CloseIcon size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>아직 태그가 없습니다.</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.arrayHead}>
          <h2 className={styles.legend}>링크 (GitHub · Live 등)</h2>
          <button type="button" className={styles.add} onClick={addLink}>
            + 링크 추가
          </button>
        </div>
        {form.links.length === 0 ? (
          <p className={styles.note}>아직 링크가 없습니다.</p>
        ) : (
          <ul className={styles.arrayList}>
            {form.links.map((link, index) => (
              <li key={index} className={styles.linkRow}>
                <input
                  className={styles.linkLabel}
                  value={link.label}
                  placeholder="GitHub"
                  onChange={(e) => editLink(index, "label", e.target.value)}
                />
                <input
                  className={styles.input}
                  value={link.href}
                  placeholder="https://…"
                  onChange={(e) => editLink(index, "href", e.target.value)}
                />
                <button type="button" className={styles.remove} onClick={() => removeLink(index)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>이미지</h2>
        <DevImageField
          projectId={projectId}
          cover={form.cover}
          images={form.images}
          onCoverChange={onCoverChange}
          onImagesChange={onImagesChange}
          onPendingChange={onUploadPendingChange}
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
        <button type="submit" className={styles.submit} disabled={saving || uploading}>
          {saving ? "저장 중…" : isEdit ? "수정 저장" : "프로젝트 저장"}
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

export { ProjectForm };
