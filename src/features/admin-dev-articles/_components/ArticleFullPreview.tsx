"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";



import { ArticleDetailView } from "@/features/dev-blog/_components/ArticleDetailView";

import { useMounted } from "@/hooks/use-mounted";

import { adminIdToken } from "@/features/admin-dev-articles/_lib/admin-id-token";
import { fromStoredArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-recovery";
import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import {
  previewArticleMarkdown,
  type ArticlePreviewResult,
} from "@/features/admin-dev-articles/_lib/preview-article-markdown";
import { articleReadingMinutes } from "@/features/dev-blog/_lib/markdown-reading-time";

import { ADMIN_UNTITLED } from "@/constants/admin-labels";
import { adminDevArticleRoute } from "@/constants/routes";
import { articleRecoverySlot, readFormRecovery } from "@/lib/admin/form-recovery";
import { pickText } from "@/lib/i18n/pick-text";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

import styles from "./ArticleFullPreview.module.css";

type Props = { articleId: string };

type Loaded = { article: DevArticle; tags: DevArticleTag[]; preview: ArticlePreviewResult };

type Status = "loading" | "ready" | "missing" | "error";

/**
 * 관리자 전용 전체 페이지 미리보기 — 마지막으로 **저장한** 글을 공개 지면과 같은 컴포넌트로 그린다.
 *
 * 편집기 옆 미리보기가 저장 전 값을 보여 주는 것과 다르다. 여기서는 저장소에서 다시 읽으므로
 * 저장하지 않은 변경은 반영되지 않는다. 그 상태를 숨기지 않고 위에 안내를 띄운다(07-dev-blog §5) —
 * 저장한 줄 알고 확인하다가 다른 글을 보고 있는 상황을 막는다.
 *
 * 관리자 인증 안에서만 열리며 sitemap·검색·RAG·WebMCP 어디에도 등록하지 않는다.
 *
 * @param {Props} props
 * @param {string} props.articleId 미리 볼 글의 문서 ID.
 * @returns {JSX.Element}
 */
const ArticleFullPreview = ({ articleId }: Props) => {
  const mounted = useMounted();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const unsaved = useMemo(
    () =>
      mounted
        ? readFormRecovery(
            window.localStorage,
            articleRecoverySlot(articleId),
            fromStoredArticleInput,
          ) !== null
        : false,
    [mounted, articleId],
  );

  useEffect(() => {
    let alive = true;
    const repository = getDevArticleRepository();

    (async () => {
      const [article, tags] = await Promise.all([repository.get(articleId), repository.listTags()]);
      if (!article) {
        if (alive) setStatus("missing");
        return;
      }
      const idToken = await adminIdToken();
      const preview = await previewArticleMarkdown(idToken, article.body);
      if (!alive) return;
      setLoaded({ article, tags, preview });
      setStatus("ready");
    })().catch((caught: Error) => {
      if (!alive) return;
      setError(caught.message);
      setStatus("error");
    });

    return () => {
      alive = false;
    };
  }, [articleId]);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <span className={styles.badge}>관리자 미리보기</span>
        {unsaved ? (
          <span className={styles.warn}>
            저장하지 않은 변경이 있습니다. 편집 화면에서 저장한 뒤 다시 여세요.
          </span>
        ) : null}
        <Link href={adminDevArticleRoute(articleId)} className={styles.back}>
          편집으로
        </Link>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}
      {status === "missing" ? <p className={styles.state}>글을 찾을 수 없습니다.</p> : null}
      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "미리보기를 만들지 못했습니다."}
        </p>
      ) : null}

      {loaded ? (
        <ArticleDetailView
          title={pickText(loaded.article.title, "ko") || ADMIN_UNTITLED}
          summary={pickText(loaded.article.summary, "ko")}
          cover={loaded.article.cover}
          coverAlt={loaded.article.coverAlt ? pickText(loaded.article.coverAlt, "ko") : ""}
          publishedAt={loaded.article.publishedAt}
          readingMinutes={articleReadingMinutes(loaded.preview.document)}
          tagLabels={loaded.article.tags.map(
            (id) => loaded.tags.find((tag) => tag.id === id)?.ko ?? id,
          )}
          document={loaded.preview.document}
          highlights={loaded.preview.highlights}
          // 관리자 UI 언어와 무관하게 한국어 지면을 보여 준다 — 본문 원문이 한국어 하나뿐이다.
          lang="ko"
        />
      ) : null}
    </div>
  );
};

export { ArticleFullPreview };
