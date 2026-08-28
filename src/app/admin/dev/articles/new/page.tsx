"use client";

import { useState } from "react";

import { ArticleForm } from "@/features/admin-dev-articles/_components/ArticleForm";

import { useMounted } from "@/hooks/use-mounted";

import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import { resolveNewArticleId } from "@/features/admin-dev-articles/_lib/new-article-id";

/**
 * ID 를 정한 뒤의 새 글 폼. 마운트 뒤에만 렌더되므로 초기화에서 `window` 를 만져도 안전하다.
 */
const MountedNewDevArticle = () => {
  const [articleId] = useState(() =>
    resolveNewArticleId(window.sessionStorage, () => getDevArticleRepository().newId()),
  );
  return <ArticleForm articleId={articleId} />;
};

/**
 * 새 글 — 이 탭이 쓰던 문서 ID를 이어 쓰고, 없으면 한 번 발급해 폼에 넘긴다.
 * 첫 저장 전에 올린 이미지와 편집 복구본이 같은 ID를 기준으로 남기 때문이다(07-dev-blog §4·§5).
 *
 * 관리자 페이지도 서버에서 한 번 평가되므로(저장소의 thunk 컨벤션과 같은 이유) `window` 는
 * 마운트 뒤에만 만진다 — 테스트 세션에서는 `AuthGuard` 가 SSR 에서도 children 을 렌더한다.
 *
 * @returns 마운트 전에는 아무것도 그리지 않는다.
 */
const NewDevArticlePage = () => {
  const mounted = useMounted();
  return mounted ? <MountedNewDevArticle /> : null;
};

export default NewDevArticlePage;
