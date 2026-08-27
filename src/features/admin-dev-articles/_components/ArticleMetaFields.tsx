"use client";

import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";

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
      <LocalizedFieldPair
        label="제목"
        value={form.title}
        onChange={(next) => onPatch({ title: next })}
      />
    </section>

    <section className={styles.section}>
      <h2 className={styles.legend}>요약</h2>
      <LocalizedFieldPair
        label="요약"
        value={form.summary}
        onChange={(next) => onPatch({ summary: next })}
        multiline
        rows={4}
      />
    </section>

    <section className={styles.section}>
      <h2 className={styles.legend}>주소와 발행일</h2>
      <div className={styles.grid2}>
        <AdminField label="주소 (slug)">
          <AdminInput
            className={styles.mono}
            value={form.slug}
            disabled={slugLocked}
            onChange={(event) => onSlugChange(event.target.value)}
          />
          <span className={styles.note}>
            {slugLocked
              ? "발행한 글의 주소는 바꿀 수 없습니다. 공유된 링크가 끊어집니다."
              : "제목을 적으면 자동으로 제안하고, 직접 고치면 그 값을 씁니다."}
          </span>
        </AdminField>
        <AdminField label="발행일">
          <AdminInput
            type="datetime-local"
            className={styles.mono}
            value={toDateTimeLocalValue(form.publishedAt)}
            onChange={(event) =>
              onPatch({ publishedAt: fromDateTimeLocalValue(event.target.value) })
            }
          />
          <span className={styles.note}>목록 정렬 기준입니다. 발행하려면 채워야 합니다.</span>
        </AdminField>
      </div>
    </section>
  </>
);

export { ArticleMetaFields };
