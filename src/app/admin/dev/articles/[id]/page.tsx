"use client";

import { use, useEffect, useState } from "react";

import { ArticleForm } from "@/features/admin-dev-articles/_components/ArticleForm";

import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";

import type { DevArticle } from "@/types/dev-article";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

/**
 * 글 수정 — 문서 한 건을 읽어 폼에 넘긴다. 본문은 여기서만 읽는다(목록은 projection).
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element | null}
 */
const EditDevArticlePage = ({ params }: Props) => {
  const { id } = use(params);
  const [article, setArticle] = useState<DevArticle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getDevArticleRepository()
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        setArticle(loaded);
        setStatus(loaded ? "found" : "missing");
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") return <p className={styles.state}>불러오는 중…</p>;
  if (status === "missing") return <p className={styles.state}>글을 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "글을 불러오지 못했습니다."}
      </p>
    );

  return article ? <ArticleForm articleId={id} initial={article} /> : null;
};

export default EditDevArticlePage;
