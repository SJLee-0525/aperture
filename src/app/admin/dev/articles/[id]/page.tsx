"use client";

import { use } from "react";

import { ArticleForm } from "@/features/admin-dev-articles/_components/ArticleForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";

import type { DevArticle } from "@/types/dev-article";

type Props = { params: Promise<{ id: string }> };

/**
 * 글 수정 — id 로 로드 후 ArticleForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditDevArticlePage = ({ params }: Props) => {
  const { id } = use(params);
  const { doc, status, error } = useAdminDocLoad<DevArticle>(getDevArticleRepository, id);

  return (
    <AdminDocGate status={status} error={error} noun="글">
      {doc ? <ArticleForm articleId={id} initial={doc} /> : null}
    </AdminDocGate>
  );
};

export default EditDevArticlePage;
