"use client";

import { useRouter } from "next/navigation";
import { useMemo, type FormEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { ArticleBodyEditor } from "@/features/admin-dev-articles/_components/ArticleBodyEditor";
import { ArticleCoverField } from "@/features/admin-dev-articles/_components/ArticleCoverField";
import { ArticleIssueList } from "@/features/admin-dev-articles/_components/ArticleIssueList";
import { ArticleMetaFields } from "@/features/admin-dev-articles/_components/ArticleMetaFields";
import { ArticleRelatedProjectsField } from "@/features/admin-dev-articles/_components/ArticleRelatedProjectsField";
import { ArticleTagsField } from "@/features/admin-dev-articles/_components/ArticleTagsField";

import { useArticleEditor } from "@/features/admin-dev-articles/_hooks/use-article-editor";
import { useArticleRecovery } from "@/features/admin-dev-articles/_hooks/use-article-recovery";
import { useArticleReferences } from "@/features/admin-dev-articles/_hooks/use-article-references";

import { createArticleImageUploader } from "@/features/admin-dev-articles/_lib/article-image-uploader";
import { clearNewArticleId } from "@/features/admin-dev-articles/_lib/new-article-id";

import { adminDevArticlePreviewRoute, ROUTES } from "@/constants/routes";
import { formatShotAt } from "@/lib/format/format-date";

import type { DevArticle } from "@/types/dev-article";

import styles from "./ArticleForm.module.css";

type Props = {
  articleId: string;
  /** 있으면 수정 모드. */
  initial?: DevArticle;
};

/**
 * 글 작성·수정 폼 — 메타 필드 · 태그 · 연관 프로젝트 · 대표 이미지 · Markdown 본문 · 저장.
 *
 * 조립만 하고 상태는 훅이 갖는다. 발행은 별도 버튼이 아니라 폼의 공개 상태이며, 저장할 때
 * 발행 조건을 만족하지 않으면 저장 자체를 하지 않는다 — 조건을 만족하지 못한 채 공개로 넘어간
 * 문서가 남는 것을 막는다. 초안 저장에는 조건을 걸지 않는다(계획 §3).
 *
 * @param {Props} props
 * @param {string} props.articleId 새 글이면 미리 발급한 ID, 수정이면 문서 ID.
 * @param {DevArticle | undefined} props.initial 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const ArticleForm = ({ articleId, initial }: Props) => {
  const router = useRouter();
  const references = useArticleReferences();
  const editor = useArticleEditor(articleId, references, initial);
  const recovery = useArticleRecovery(articleId, editor.form, editor.dirty);
  const upload = useMemo(() => createArticleImageUploader(articleId), [articleId]);

  const blockedByPublish = editor.form.published && editor.publishIssues.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await editor.save()) recovery.clear();
  };

  // 취소는 편집을 버리는 동작이다. 링크로 두면 복구본과 이 탭이 잡아 둔 새 글 ID가 남아
  // 다음에 새 글을 열 때 버린 편집본이 다시 제안된다.
  const cancelEditing = () => {
    if (editor.dirty && !window.confirm("저장하지 않은 변경을 버릴까요?")) return;
    recovery.abandon();
    if (!editor.isEdit) clearNewArticleId(window.sessionStorage);
    router.replace(ROUTES.ADMIN_DEV_ARTICLES);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{editor.isEdit ? "글 수정" : "새 글"}</h1>
        <div className={styles.headState}>
          {editor.dirty ? <span>저장하지 않은 변경</span> : null}
          {editor.savedAt ? <span>저장 {formatShotAt(editor.savedAt)}</span> : null}
        </div>
      </header>

      {recovery.pending ? (
        <div className={`${styles.panel} ${styles.recovery}`}>
          <p className={styles.recoveryNote}>
            저장하지 않은 편집본이 있습니다 ({formatShotAt(new Date(recovery.pending.savedAt))}).
          </p>
          <div className={styles.recoveryActions}>
            <AdminButton
              variant="secondary"
              size="xs"
              onClick={() => {
                const restored = recovery.restore();
                if (restored) editor.applyForm(restored);
              }}
            >
              복구하기
            </AdminButton>
            <button type="button" className={styles.remove} onClick={recovery.discard}>
              버리기
            </button>
          </div>
        </div>
      ) : null}

      {references.error ? (
        <p className={styles.error} role="alert">
          {references.error}
        </p>
      ) : null}

      <ArticleMetaFields
        form={editor.form}
        slugLocked={editor.slugLocked}
        onPatch={editor.patch}
        onSlugChange={editor.onSlugChange}
      />

      <ArticleTagsField
        tags={references.tags}
        selected={editor.form.tags}
        onChange={(tags) => editor.patch({ tags })}
        onCreate={references.addTag}
      />

      <ArticleRelatedProjectsField
        projects={references.projects}
        selected={editor.form.relatedProjectIds}
        onChange={(relatedProjectIds) => editor.patch({ relatedProjectIds })}
      />

      <ArticleCoverField form={editor.form} upload={upload} onPatch={editor.patch} />

      <ArticleBodyEditor
        value={editor.form.body}
        upload={upload}
        onChange={(body) => editor.patch({ body })}
      />

      <ArticleIssueList
        title="발행하려면 고쳐야 할 곳"
        publishIssues={editor.publishIssues}
        markdownIssues={editor.markdownIssues}
      />

      <div className={styles.actions}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={editor.form.published}
            onChange={(event) => editor.patch({ published: event.target.checked })}
          />
          <span>발행</span>
        </label>

        <span className={styles.spacer} />

        {editor.isEdit ? (
          <AdminButton
            variant="secondary"
            href={adminDevArticlePreviewRoute(articleId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            전체 미리보기
          </AdminButton>
        ) : null}
        <AdminButton variant="secondary" disabled={editor.saving} onClick={cancelEditing}>
          취소
        </AdminButton>
        <AdminButton variant="primary" type="submit" disabled={editor.saving || blockedByPublish}>
          {editor.saving ? "저장 중…" : "저장"}
        </AdminButton>
      </div>

      {editor.error ? (
        <p className={styles.error} role="alert">
          {editor.error}
        </p>
      ) : null}
    </form>
  );
};

export { ArticleForm };
