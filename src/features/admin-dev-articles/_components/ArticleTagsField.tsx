"use client";

import { useState } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { normalizeArticleSlug } from "@/features/admin-dev-articles/_lib/dev-article-slug";

import type { DevArticleTag } from "@/types/dev-article-tag";

import styles from "./ArticleForm.module.css";

type Props = {
  tags: DevArticleTag[];
  selected: string[];
  onChange: (next: string[]) => void;
  onCreate: (tag: DevArticleTag) => Promise<void>;
};

/**
 * 태그 선택과 새 태그 추가.
 *
 * 글에는 라벨이 아니라 id 를 저장한다 — 라벨을 고쳐도 글을 건드리지 않아야 하기 때문이다
 * (07-dev-blog §5). 새 태그의 id 는 영어 라벨에서 만들고, 비었으면 한국어 라벨을 로마자로 바꾼다.
 * 라벨이 공백뿐이면 추가 버튼을 잠그고, id 중복은 저장소가 거부해 문구로 보여 준다.
 *
 * @param props.tags 사전에 있는 태그 전체.
 * @param props.selected 이 글이 고른 태그 id.
 * @param props.onChange 고른 태그가 바뀌었을 때.
 * @param props.onCreate 사전에 태그를 더한다. 실패하면 예외를 던진다.
 */
const ArticleTagsField = ({ tags, selected, onChange, onCreate }: Props) => {
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const nextId = normalizeArticleSlug(en) || normalizeArticleSlug(ko);
  const canAdd = Boolean(ko.trim() && en.trim() && nextId) && !adding;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((tag) => tag !== id) : [...selected, id]);

  const add = async () => {
    if (!canAdd) return;
    setAdding(true);
    setError(null);
    try {
      await onCreate({ id: nextId, ko: ko.trim(), en: en.trim() });
      onChange([...selected, nextId]);
      setKo("");
      setEn("");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.legend}>태그</h2>

      {tags.length === 0 ? (
        <p className={styles.note}>등록된 태그가 없습니다. 아래에서 추가하세요.</p>
      ) : (
        <div className={styles.chips}>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={styles.chip}
              aria-pressed={selected.includes(tag.id)}
              onClick={() => toggle(tag.id)}
            >
              {tag.ko}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inlineForm}>
        <AdminField label="새 태그 (한국어)" className={styles.inlineField}>
          <AdminInput value={ko} onChange={(event) => setKo(event.target.value)} />
        </AdminField>
        <AdminField label="새 태그 (English)" className={styles.inlineField}>
          <AdminInput value={en} onChange={(event) => setEn(event.target.value)} />
        </AdminField>
        <AdminButton variant="secondary" disabled={!canAdd} onClick={add}>
          + 태그 추가
        </AdminButton>
      </div>

      {nextId ? <p className={styles.note}>저장할 id: {nextId}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export { ArticleTagsField };
