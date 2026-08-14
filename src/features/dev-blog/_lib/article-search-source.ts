import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";
import { articleTagTokens } from "@/features/dev-blog/_lib/article-tag-tokens";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

/** 결과 행의 태그 구분자. 사진 결과의 장소 표기와 같은 가운뎃점을 쓴다. */
const TAG_SEPARATOR = " · ";

/**
 * 통합검색이 글 한 건을 색인하는 데 필요한 값. 본문 전문은 담지 않는다 —
 * 이 투영은 `/api/search-index` 로 브라우저에 통째로 내려가므로 글마다 원문을 실으면
 * 글 수에 비례해 전송량이 늘어난다. 본문 질문은 챗봇 RAG 가 맡는다.
 */
type ArticleSearchSource = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  cover: ImageMeta | null;
  /** 태그마다 id·한국어 라벨·영어 라벨 세 값. 한쪽 언어로만 물어도 닿게 한다. */
  tagLabels: string[];
  /** 결과 행에 보여 줄 태그 목록. 색인용 `tagLabels` 와 달리 현재 언어 라벨만 담는다. */
  tagText: LocalizedText;
  /** 본문 h2·h3 평문. 목차 수준의 검색을 가능하게 한다. */
  headings: string[];
};

/**
 * 글 목록과 태그 사전을 검색 색인용 투영으로 바꾼다.
 *
 * @param {readonly DevArticle[]} articles 공개된 글 목록.
 * @param {readonly DevArticleTag[]} tags 블로그 태그 사전.
 * @returns {ArticleSearchSource[]} 입력 순서를 지킨 검색 투영.
 */
const toArticleSearchSources = (
  articles: readonly DevArticle[],
  tags: readonly DevArticleTag[],
): ArticleSearchSource[] => {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  const tagText = (tagIds: readonly string[]): LocalizedText => ({
    ko: tagIds.map((id) => tagById.get(id)?.ko ?? id).join(TAG_SEPARATOR),
    en: tagIds.map((id) => tagById.get(id)?.en ?? id).join(TAG_SEPARATOR),
  });

  return articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    cover: article.cover,
    tagLabels: articleTagTokens(article.tags, tags, { includeId: true }),
    tagText: tagText(article.tags),
    headings: analyzeArticle(article).headings,
  }));
};

export { toArticleSearchSources };
export type { ArticleSearchSource };
