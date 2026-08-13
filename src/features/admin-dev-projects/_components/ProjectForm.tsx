"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
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
        <h2 className={styles.legend}>분류 · 연도</h2>
        <div className={styles.grid2}>
          <AdminField label="분류 (한국어)">
            <AdminInput
              value={form.category.ko}
              placeholder="SSAFY 관통 프로젝트"
              onChange={(e) => patch({ category: { ...form.category, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="분류 (English)">
            <AdminInput
              value={form.category.en}
              onChange={(e) => patch({ category: { ...form.category, en: e.target.value } })}
            />
          </AdminField>
          <AdminField label="연도">
            <AdminInput
              value={form.year}
              placeholder="2025"
              onChange={(e) => patch({ year: e.target.value })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>기간 · 포지션</h2>
        <div className={styles.grid2}>
          <AdminField label="기간 (한국어)">
            <AdminInput
              value={form.period.ko}
              placeholder="2025. 12. — 현재"
              onChange={(e) => patch({ period: { ...form.period, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="기간 (English)">
            <AdminInput
              value={form.period.en}
              placeholder="Dec 2025 — Present"
              onChange={(e) => patch({ period: { ...form.period, en: e.target.value } })}
            />
          </AdminField>
          <AdminField label="포지션 (한국어)">
            <AdminInput
              value={form.position.ko}
              placeholder="Frontend 전체 · 6인 팀 (FE 1 · BE 2 · AI 3)"
              onChange={(e) => patch({ position: { ...form.position, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="포지션 (English)">
            <AdminInput
              value={form.position.en}
              placeholder="Sole frontend engineer · team of 6"
              onChange={(e) => patch({ position: { ...form.position, en: e.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>요약 (카드 한 줄)</h2>
        <div className={styles.grid2}>
          <AdminField label="요약 (한국어)">
            <AdminInput
              multiline
              rows={2}
              value={form.summary.ko}
              onChange={(e) => patch({ summary: { ...form.summary, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="요약 (English)">
            <AdminInput
              multiline
              rows={2}
              value={form.summary.en}
              onChange={(e) => patch({ summary: { ...form.summary, en: e.target.value } })}
            />
          </AdminField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>개요</h2>
        <div className={styles.grid2}>
          <AdminField label="개요 (한국어)">
            <AdminInput
              multiline
              rows={5}
              value={form.overview.ko}
              onChange={(e) => patch({ overview: { ...form.overview, ko: e.target.value } })}
            />
          </AdminField>
          <AdminField label="개요 (English)">
            <AdminInput
              multiline
              rows={5}
              value={form.overview.en}
              onChange={(e) => patch({ overview: { ...form.overview, en: e.target.value } })}
            />
          </AdminField>
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
          <AdminInput
            className={styles.tagInput}
            aria-label="기술명"
            value={tagDraft}
            placeholder="React"
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKeyDown}
          />
          <AdminButton variant="secondary" onClick={addTag}>
            + 태그 추가
          </AdminButton>
        </div>
        <p className={styles.inputHint}>Enter로도 추가할 수 있습니다.</p>
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
          <AdminButton variant="secondary" size="xs" onClick={addLink}>
            + 링크 추가
          </AdminButton>
        </div>
        {form.links.length === 0 ? (
          <p className={styles.note}>아직 링크가 없습니다.</p>
        ) : (
          <ul className={styles.arrayList}>
            {form.links.map((link, index) => (
              <li key={index} className={styles.linkRow}>
                <AdminInput
                  className={styles.linkLabel}
                  aria-label="링크 라벨"
                  value={link.label}
                  placeholder="GitHub"
                  onChange={(e) => editLink(index, "label", e.target.value)}
                />
                <AdminInput
                  className={styles.linkHref}
                  aria-label="링크 주소"
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

export { ProjectForm };
