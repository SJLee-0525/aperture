"use client";

import {
  markdownIssueMessage,
  publishIssueMessage,
} from "@/features/admin-dev-articles/_lib/dev-article-issue-message";

import type { DevArticlePublishIssue } from "@/features/admin-dev-articles/_lib/dev-article-publish-check";
import type { ArticleMarkdownIssue } from "@/features/dev-blog/_lib/markdown-nodes";

import styles from "./ArticleForm.module.css";

type Props = {
  title: string;
  markdownIssues?: ArticleMarkdownIssue[];
  publishIssues?: DevArticlePublishIssue[];
};

/**
 * 발행을 막는 사유 목록. Markdown 검증 결과와 발행 조건을 같은 모양으로 보여 준다.
 *
 * 초안 저장은 이 목록이 있어도 막지 않는다. 쓰다 만 글을 잃지 않는 것이 우선이고,
 * 여기 남은 항목은 발행 버튼을 누를 때만 걸림돌이 된다(계획 §3).
 *
 * @param {Props} props
 * @param {string} props.title 목록 위에 붙일 이름.
 * @param {ArticleMarkdownIssue[] | undefined} props.markdownIssues 본문 검증 결과. 원문 줄 번호를 함께 보여 준다.
 * @param {DevArticlePublishIssue[] | undefined} props.publishIssues 발행 조건 검사 결과.
 * @returns {JSX.Element | null} 사유가 하나도 없으면 아무것도 그리지 않는다.
 */
const ArticleIssueList = ({ title, markdownIssues = [], publishIssues = [] }: Props) => {
  if (markdownIssues.length === 0 && publishIssues.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.legend}>{title}</h2>
      <ul className={styles.issues}>
        {publishIssues.map((issue, index) => (
          <li key={`publish-${index}`} className={styles.issue}>
            {publishIssueMessage(issue)}
          </li>
        ))}
        {markdownIssues.map((issue, index) => (
          <li key={`markdown-${index}`} className={styles.issue}>
            {markdownIssueMessage(issue)}
          </li>
        ))}
      </ul>
    </section>
  );
};

export { ArticleIssueList };
