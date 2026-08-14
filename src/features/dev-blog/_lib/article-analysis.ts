import { cache } from "react";

import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";
import { articleReadingMinutes } from "@/features/dev-blog/_lib/markdown-reading-time";

import type { ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";
import type { DevArticle } from "@/types/dev-article";

/** 목차·검색 색인이 쓰는 heading 깊이. h4 는 절 구분이 아니라 문단 안 소제목이라 제외한다. */
const INDEXED_HEADING_MAX_DEPTH = 3;

type ArticleAnalysis = {
  document: ArticleDocument;
  /** h2·h3 의 평문. 파서가 계산해 둔 `heading.text` 를 그대로 쓴다. */
  headings: string[];
  readingMinutes: number;
};

/**
 * 글 하나의 본문을 한 번 파싱해 문서·목차·읽기 시간을 함께 낸다.
 *
 * 같은 RSC 요청에서 같은 `DevArticle` 객체를 여러 projection(목록 요약, 검색 색인,
 * WebMCP 도구 데이터, 상세 렌더)이 소비할 때 중복 파싱을 줄인다. 요청 간 캐시는 의도하지 않는다.
 * `react.cache` 는 인자 identity 로 판단하므로 서로 다른 요청이나 React 렌더 밖에서는
 * 매번 새로 계산한다.
 *
 * @param {DevArticle} article 본문(`body`)을 가진 글.
 * @returns {ArticleAnalysis} 렌더 트리와 그로부터 파생한 목차·읽기 시간.
 */
const analyzeArticle = cache((article: DevArticle): ArticleAnalysis => {
  const { document } = parseArticleMarkdown(article.body);
  return {
    document,
    headings: document.blocks
      .filter((block) => block.type === "heading" && block.depth <= INDEXED_HEADING_MAX_DEPTH)
      .map((block) => (block.type === "heading" ? block.text : ""))
      .filter(Boolean),
    readingMinutes: articleReadingMinutes(document),
  };
});

export { analyzeArticle };
