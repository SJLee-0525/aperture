"use client";

import { useState } from "react";

import { ArticleForm } from "@/features/admin-dev-articles/_components/ArticleForm";
import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import { resolveNewArticleId } from "@/features/admin-dev-articles/_lib/new-article-id";

/**
 * 새 글 — 이 탭이 쓰던 문서 ID를 이어 쓰고, 없으면 한 번 발급해 폼에 넘긴다.
 * 첫 저장 전에 올린 이미지와 편집 복구본이 같은 ID를 기준으로 남기 때문이다(계획 §4·§5).
 *
 * @returns {JSX.Element}
 */
const NewDevArticlePage = () => {
  const [articleId] = useState(() =>
    resolveNewArticleId(window.sessionStorage, () => getDevArticleRepository().newId()),
  );
  return <ArticleForm articleId={articleId} />;
};

export default NewDevArticlePage;
