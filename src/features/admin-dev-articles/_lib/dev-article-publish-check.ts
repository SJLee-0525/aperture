import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import type { ArticleMarkdownIssue } from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 발행을 막는 사유. 문구가 아니라 코드로 다룬다 — 화면 문구는
 * `dev-article-issue-message` 한 곳에서 붙인다.
 */
type DevArticlePublishIssueCode =
  /** 한국어·영어 제목 중 하나가 비어 있다. 목록 카드와 metadata 가 언어별로 필요하다. */
  | "title-missing"
  /** 요약이 비어 있다. 목록·검색·챗봇 참조 카드가 모두 요약을 쓴다. */
  | "summary-missing"
  /** 정규화 후 남는 글자가 없는 slug. */
  | "slug-missing"
  /** 다른 글이 이미 쓰는 slug. */
  | "slug-duplicated"
  /** 본문이 비어 있다. */
  | "body-missing"
  /** 발행일을 지정하지 않았다. 목록 정렬과 탐색의 기준이라 발행에는 필수다. */
  | "published-at-missing"
  /** 대표 이미지를 넣고 대체 텍스트를 비웠다. */
  | "cover-alt-missing"
  /** 본문 Markdown 에 렌더할 수 없는 곳이 있다. 자세한 위치는 Markdown 검증 결과가 갖는다. */
  | "markdown-blocked"
  /** 사전에 없는 태그 id 를 참조한다. */
  | "tag-unknown"
  /** 공개할 수 없는 프로젝트를 연관으로 걸었다. */
  | "related-project-unavailable";

type DevArticlePublishIssue = {
  code: DevArticlePublishIssueCode;
  /** 원인을 좁히는 값. 태그 id 처럼 그대로 보여 줘도 되는 것만 담는다. */
  detail?: string;
};

type PublishCheckContext = {
  /** 중복 검사 대상. 편집 중인 글도 들어 있어도 된다. */
  articles: Array<{ id: string; slug: string }>;
  /** 편집 중인 글의 문서 ID. 자기 slug 를 중복으로 보지 않기 위해 쓴다. */
  selfId: string;
  /** 본문 Markdown 검증 결과. 하나라도 있으면 발행을 막는다. */
  markdownIssues: ArticleMarkdownIssue[];
  /** 사전에 있는 태그 id. */
  knownTagIds: string[];
  /** 공개된 프로젝트 id. 비공개·삭제된 프로젝트는 여기 없다. */
  publishableProjectIds: string[];
};

/**
 * 두 언어 값이 모두 채워졌는지 본다.
 *
 * @param {{ ko: string; en: string }} text 검사할 값.
 * @returns {boolean} 한쪽이라도 비어 있으면 false.
 */
const hasBothLanguages = (text: { ko: string; en: string }): boolean =>
  Boolean(text.ko.trim()) && Boolean(text.en.trim());

/**
 * 발행 조건을 검사한다(07-dev-blog §5). 관리자 화면과 저장 함수가 같은 함수를 부른다 —
 * 조건을 두 벌 적으면 화면에서는 막고 저장에서는 통과하는 상태가 생긴다.
 *
 * 초안 저장은 이 검사를 거치지 않는다. 작성 중인 내용을 잃지 않는 것이 우선이라
 * 미완성 글도 저장할 수 있어야 한다(07-dev-blog §3).
 *
 * @param {DevArticleInput} input `prepareArticleInput` 을 거친 저장 값.
 * @param {PublishCheckContext} context 중복·사전·관계를 판단할 주변 정보.
 * @returns {DevArticlePublishIssue[]} 발행을 막는 사유. 비어 있으면 발행할 수 있다.
 */
const checkArticlePublishable = (
  input: DevArticleInput,
  context: PublishCheckContext,
): DevArticlePublishIssue[] => {
  const issues: DevArticlePublishIssue[] = [];

  if (!hasBothLanguages(input.title)) issues.push({ code: "title-missing" });
  if (!hasBothLanguages(input.summary)) issues.push({ code: "summary-missing" });
  if (!input.slug) issues.push({ code: "slug-missing" });
  else if (context.articles.some((a) => a.slug === input.slug && a.id !== context.selfId)) {
    issues.push({ code: "slug-duplicated", detail: input.slug });
  }
  if (!input.body.trim()) issues.push({ code: "body-missing" });
  if (!input.publishedAt) issues.push({ code: "published-at-missing" });
  if (input.cover && !hasBothLanguages(input.coverAlt ?? { ko: "", en: "" })) {
    issues.push({ code: "cover-alt-missing" });
  }
  if (context.markdownIssues.length > 0) issues.push({ code: "markdown-blocked" });

  input.tags
    .filter((tag) => !context.knownTagIds.includes(tag))
    .forEach((tag) => issues.push({ code: "tag-unknown", detail: tag }));

  input.relatedProjectIds
    .filter((projectId) => !context.publishableProjectIds.includes(projectId))
    .forEach((projectId) =>
      issues.push({ code: "related-project-unavailable", detail: projectId }),
    );

  return issues;
};

export { checkArticlePublishable };
export type { DevArticlePublishIssue, PublishCheckContext };
