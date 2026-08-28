"use client";

import { useBlogTools } from "@/features/dev-blog/_hooks/use-blog-tools";

import type { ArticleToolData } from "@/features/dev-blog/_lib/article-tool-data";
import type { DevArticleTag } from "@/types/dev-article-tag";

type Props = { articles: ArticleToolData[]; tags: DevArticleTag[] };

/**
 * 블로그 도구를 실제로 등록한다. 지원 게이트(`BlogTools`)를 통과한 뒤에만 마운트된다.
 *
 * @param props.articles 공개 글 투영.
 * @param props.tags 태그 사전 전체.
 */
const BlogToolsRegistry = ({ articles, tags }: Props) => {
  useBlogTools(articles, tags);
  return null;
};

export { BlogToolsRegistry };
