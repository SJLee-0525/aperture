import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";
import { articleTagTokens } from "@/features/dev-blog/_lib/article-tag-tokens";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { LocalizedText } from "@/types/localized";

/**
 * WebMCP 도구가 쓰는 글 한 건. 본문은 담지 않는다 — 도구 출력은 1,500자 예산 안이라
 * 전문이 아니라 요약과 목차를 돌려준다(ADR-0003).
 */
type ArticleToolData = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  /** 태그 필터가 대조할 id. 라벨과 함께 세 값 모두로 찾을 수 있게 한다. */
  tagIds: string[];
  /** 사람이 읽을 태그 라벨(현재 언어와 무관하게 ko·en 모두). */
  tagLabels: string[];
  publishedAt: Date;
  readingMinutes: number;
  /** 본문 h2·h3 평문. `get_blog_post` 의 목차다. */
  headings: string[];
};

/**
 * 공개 글 목록을 도구용 투영으로 바꾼다. 서버 컴포넌트가 한 번 만들어 넘긴다 —
 * 도구는 새 데이터 소스를 만들지 않는다(ADR-0003).
 *
 * @param {readonly DevArticle[]} articles 공개된 글. 발행일 내림차순 정렬을 그대로 지킨다.
 * @param {readonly DevArticleTag[]} tags 블로그 태그 사전.
 * @returns {ArticleToolData[]}
 */
const toArticleToolData = (
  articles: readonly DevArticle[],
  tags: readonly DevArticleTag[],
): ArticleToolData[] =>
  articles.map((article) => {
    const { headings, readingMinutes } = analyzeArticle(article);
    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      tagIds: article.tags,
      tagLabels: articleTagTokens(article.tags, tags),
      publishedAt: article.publishedAt ?? article.createdAt,
      readingMinutes,
      headings,
    };
  });

export { toArticleToolData };
export type { ArticleToolData };
