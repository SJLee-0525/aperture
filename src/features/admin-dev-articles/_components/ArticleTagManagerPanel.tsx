"use client";

import { useState } from "react";

import { useArticleTagsAdmin } from "@/features/admin-dev-articles/_hooks/use-article-tags-admin";

import { normalizeArticleSlug } from "@/features/admin-dev-articles/_lib/dev-article-slug";

import type { DevArticleTag } from "@/types/dev-article-tag";

import styles from "./ArticleTagManagerPanel.module.css";

type RowProps = {
  tag: DevArticleTag;
  usedCount: number;
  onSave: (tag: DevArticleTag) => Promise<boolean>;
  onDelete: (id: string) => void;
};

/**
 * 태그 ID와 라벨, 사용 중인 글 수를 한 행에 표시한다.
 *
 * ID는 글이 참조하는 키라 수정할 수 없다. 라벨은 저장 버튼을 눌렀을 때 반영하며,
 * 사용 중인 태그는 삭제할 수 없다.
 *
 * @param {RowProps} props
 * @param {DevArticleTag} props.tag
 * @param {number} props.usedCount 이 태그를 참조하는 글 수. 0이 아니면 삭제를 잠근다.
 * @param {(tag: DevArticleTag) => Promise<boolean>} props.onSave 라벨 저장. 성공 여부를 돌려준다.
 * @param {(id: string) => void} props.onDelete 삭제 요청. 실패 사유는 패널 오류 영역이 보여 준다.
 * @returns {JSX.Element}
 */
const TagManagerRow = ({ tag, usedCount, onSave, onDelete }: RowProps) => {
  const [ko, setKo] = useState(tag.ko);
  const [en, setEn] = useState(tag.en);
  const [saving, setSaving] = useState(false);

  const dirty = ko !== tag.ko || en !== tag.en;
  const canSave = dirty && Boolean(ko.trim() && en.trim()) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const saved = await onSave({ id: tag.id, ko: ko.trim(), en: en.trim() });
    if (saved) {
      setKo(ko.trim());
      setEn(en.trim());
    }
    setSaving(false);
  };

  const remove = () => {
    if (window.confirm(`"${tag.id}" 태그를 삭제할까요?`)) onDelete(tag.id);
  };

  return (
    <li className={styles.row}>
      <code className={styles.id} title="글이 참조하는 키 — 수정 불가">
        {tag.id}
      </code>
      <label>
        <span className={styles.srLabel}>한국어 라벨</span>
        <input
          className={styles.input}
          value={ko}
          placeholder="한국어"
          onChange={(event) => setKo(event.target.value)}
        />
      </label>
      <label>
        <span className={styles.srLabel}>영어 라벨</span>
        <input
          className={styles.input}
          value={en}
          placeholder="English"
          onChange={(event) => setEn(event.target.value)}
        />
      </label>
      <span className={styles.usage}>{usedCount}건 사용</span>
      <button type="button" className={styles.action} disabled={!canSave} onClick={save}>
        저장
      </button>
      <button
        type="button"
        className={`${styles.action} ${styles.danger}`}
        disabled={usedCount > 0}
        title={usedCount > 0 ? "사용 중인 태그는 삭제할 수 없습니다." : undefined}
        onClick={remove}
      >
        삭제
      </button>
    </li>
  );
};

/**
 * 블로그 태그를 추가하고 라벨을 수정하거나 삭제하는 패널.
 *
 * 태그는 ID 순서로 표시한다. 새 ID는 영어 라벨을 우선 사용하고, 없으면 한국어 라벨을
 * 로마자로 바꿔 만든다.
 *
 * @returns {JSX.Element}
 */
const ArticleTagManagerPanel = () => {
  const { tags, usage, status, error, createTag, saveLabels, removeTag } = useArticleTagsAdmin();
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const nextId = normalizeArticleSlug(en) || normalizeArticleSlug(ko);
  const canAdd = Boolean(ko.trim() && en.trim() && nextId) && !adding;

  const add = async () => {
    if (!canAdd) return;
    setAdding(true);
    setAddError(null);
    try {
      await createTag({ id: nextId, ko: ko.trim(), en: en.trim() });
      setKo("");
      setEn("");
    } catch (caught) {
      setAddError((caught as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className={styles.panel} aria-label="태그 관리">
      <div>
        <h2 className={styles.heading}>태그 관리</h2>
        <p className={styles.hint}>
          라벨은 언제든 고칠 수 있고, 태그는 어떤 글도 쓰지 않을 때만 삭제됩니다.
        </p>
      </div>

      {status === "loading" ? <p className={styles.note}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.error} role="alert">
          {error ?? "태그 목록을 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" ? (
        <>
          {tags.length === 0 ? (
            <p className={styles.note}>등록된 태그가 없습니다. 아래에서 추가하세요.</p>
          ) : (
            <ul className={styles.rows}>
              {tags.map((tag) => (
                <TagManagerRow
                  key={tag.id}
                  tag={tag}
                  usedCount={usage[tag.id] ?? 0}
                  onSave={saveLabels}
                  onDelete={removeTag}
                />
              ))}
            </ul>
          )}

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.inlineForm}>
            <label className={styles.field}>
              <span className={styles.label}>새 태그 (한국어)</span>
              <input
                className={styles.input}
                value={ko}
                onChange={(event) => setKo(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>새 태그 (English)</span>
              <input
                className={styles.input}
                value={en}
                onChange={(event) => setEn(event.target.value)}
              />
            </label>
            <button type="button" className={styles.action} disabled={!canAdd} onClick={add}>
              + 태그 추가
            </button>
          </div>
          {nextId ? <p className={styles.note}>저장할 id: {nextId}</p> : null}
          {addError ? (
            <p className={styles.error} role="alert">
              {addError}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export { ArticleTagManagerPanel };
