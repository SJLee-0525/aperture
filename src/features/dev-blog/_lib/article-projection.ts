import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";

import type { DevArticle } from "@/types/dev-article";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

/**
 * 목록·탐색·연관 글이 쓰는 글 요약. 본문(`body`)이 없는 것이 이 타입의 존재 이유다.
 *
 * 카드 한 장에는 Markdown 원문이 필요 없는데, 목록이 `DevArticle` 을 그대로 받으면 화면에
 * 쓰지 않는 본문 전체가 브라우저로 내려간다. 읽기 시간만 서버에서 미리 세어 숫자로 넘긴다.
 */
type DevArticleSummary = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  cover: ImageMeta | null;
  coverAlt: LocalizedText | null;
  /** `DevArticleTag.id` 참조. 라벨 해석은 화면이 사전으로 한다. */
  tags: string[];
  /** 공개 글에는 항상 값이 있다. 초안이 섞여 들어오면 생성 시각으로 대신한다. */
  publishedAt: Date;
  readingMinutes: number;
  relatedProjectIds: string[];
};

/**
 * 글 한 건을 목록용 요약으로 줄인다.
 *
 * 읽기 시간은 저장 필드가 아니라 본문에서 파생한다(`DevArticle` 주석). 파싱은 `analyzeArticle` 이
 * 맡아 같은 요청의 다른 projection 과 결과를 나눠 쓴다. 색칠(shiki)은 하지 않는다 —
 * 목록에는 코드 블록을 그리지 않는다.
 *
 * @param {DevArticle} article 공개 글 한 건.
 * @returns {DevArticleSummary} 본문을 뺀 요약. 읽기 시간은 1분 이상이다.
 */
const toDevArticleSummary = (article: DevArticle): DevArticleSummary => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  summary: article.summary,
  cover: article.cover,
  coverAlt: article.coverAlt,
  tags: article.tags,
  publishedAt: article.publishedAt ?? article.createdAt,
  readingMinutes: analyzeArticle(article).readingMinutes,
  relatedProjectIds: article.relatedProjectIds,
});

/**
 * 목록 전체를 요약으로 바꾼다. 입력 순서를 그대로 지킨다 — 정렬은 getter 가 이미 마쳤다.
 *
 * @param {readonly DevArticle[]} articles 발행일 내림차순으로 정렬된 공개 글.
 * @returns {DevArticleSummary[]} 같은 순서의 요약 목록.
 */
const toDevArticleSummaries = (articles: readonly DevArticle[]): DevArticleSummary[] =>
  articles.map(toDevArticleSummary);

export { toDevArticleSummaries, toDevArticleSummary };
export type { DevArticleSummary };
