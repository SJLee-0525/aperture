"use client";

import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/features/admin-dev-articles/_lib/dev-article-datetime";
import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

import styles from "./ArticleForm.module.css";

type Props = {
  form: DevArticleInput;
  slugLocked: boolean;
  onPatch: (next: Partial<DevArticleInput>) => void;
  onSlugChange: (value: string) => void;
};

/**
 * 제목·요약·주소·발행일 필드.
 *
 * 발행일은 날짜와 시간을 직접 입력한다. 최초 발행 때 지금 시각으로 덮어쓰지 않는다 —
 * 예전 글을 옮길 때 실제 작성일을 그대로 넣어야 목록 순서가 맞는다(계획 §5).
 * 주소는 이미 발행한 글이면 잠긴다. 잠긴 이유를 입력 아래에 적어 왜 못 고치는지 알린다.
 *
 * @param {Props} props
 * @param {DevArticleInput} props.form 현재 폼 값.
 * @param {boolean} props.slugLocked 최초 발행 이후라 주소를 바꿀 수 없는 상태.
 * @param {(next: Partial<DevArticleInput>) => void} props.onPatch 폼 일부를 갱신한다.
 * @param {(value: string) => void} props.onSlugChange 주소를 직접 고친다. 이후 제목을 따라가지 않는다.
 * @returns {JSX.Element}
 */
const ArticleMetaFields = ({ form, slugLocked, onPatch, onSlugChange }: Props) => (
  <>
    <section className={styles.section}>
      <h2 className={styles.legend}>제목</h2>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>제목 (한국어)</span>
          <input
            className={styles.input}
            value={form.title.ko}
            onChange={(event) => onPatch({ title: { ...form.title, ko: event.target.value } })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>제목 (English)</span>
          <input
            className={styles.input}
            value={form.title.en}
            onChange={(event) => onPatch({ title: { ...form.title, en: event.target.value } })}
          />
        </label>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.legend}>요약</h2>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>요약 (한국어)</span>
          <textarea
            className={styles.textarea}
            value={form.summary.ko}
            onChange={(event) => onPatch({ summary: { ...form.summary, ko: event.target.value } })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>요약 (English)</span>
          <textarea
            className={styles.textarea}
            value={form.summary.en}
            onChange={(event) => onPatch({ summary: { ...form.summary, en: event.target.value } })}
          />
        </label>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.legend}>주소와 발행일</h2>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>주소 (slug)</span>
          <input
            className={`${styles.input} ${styles.mono}`}
            value={form.slug}
            disabled={slugLocked}
            onChange={(event) => onSlugChange(event.target.value)}
          />
          <span className={styles.note}>
            {slugLocked
              ? "발행한 글의 주소는 바꿀 수 없습니다. 공유된 링크가 끊어집니다."
              : "제목을 적으면 자동으로 제안하고, 직접 고치면 그 값을 씁니다."}
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>발행일</span>
          <input
            type="datetime-local"
            className={`${styles.input} ${styles.mono}`}
            value={toDateTimeLocalValue(form.publishedAt)}
            onChange={(event) =>
              onPatch({ publishedAt: fromDateTimeLocalValue(event.target.value) })
            }
          />
          <span className={styles.note}>목록 정렬 기준입니다. 발행하려면 채워야 합니다.</span>
        </label>
      </div>
    </section>
  </>
);

export { ArticleMetaFields };
