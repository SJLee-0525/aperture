"use client";

import { ArticleIssueList } from "@/features/admin-dev-articles/_components/ArticleIssueList";
import { useArticlePreview } from "@/features/admin-dev-articles/_hooks/use-article-preview";
import { ArticleBody } from "@/features/dev-blog/_components/ArticleBody";

import styles from "./ArticlePreviewPanel.module.css";

type Props = { markdown: string };

/**
 * 편집기 옆 미리보기 — 저장 전 본문을 서버 renderer 로 돌려 그대로 보여 준다.
 *
 * 여기서 그리는 것은 공개 상세와 같은 `ArticleBody` 다. 파싱과 색칠만 서버가 하고 결과는
 * JSON 으로 오므로, 브라우저에 문법 번들을 복제하지 않으면서도 같은 컴포넌트를 쓴다.
 * 렌더할 수 없는 곳은 본문 위에 원문 줄 번호와 함께 모아 보여 준다(계획 §3).
 *
 * @param {Props} props
 * @param {string} props.markdown 저장 전 본문.
 * @returns {JSX.Element}
 */
const ArticlePreviewPanel = ({ markdown }: Props) => {
  const { result, loading, error } = useArticlePreview(markdown, true);

  return (
    <div className={styles.panel}>
      {loading ? <p className={styles.state}>미리보기를 만드는 중…</p> : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <ArticleIssueList title="고쳐야 할 곳" markdownIssues={result.issues} />
          {result.document.blocks.length === 0 ? (
            <p className={styles.state}>아직 본문이 없습니다.</p>
          ) : (
            <ArticleBody document={result.document} lang="ko" highlights={result.highlights} />
          )}
        </>
      ) : null}
    </div>
  );
};

export { ArticlePreviewPanel };
