"use client";

import { use } from "react";

import { ArticleForm } from "@/features/admin-dev-articles/_components/ArticleForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";


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

  return (
    <AdminDocGate getRepository={getDevArticleRepository} id={id} noun="글">
      {(doc) => <ArticleForm articleId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditDevArticlePage;
