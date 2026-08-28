import {
  markdownIssueMessage,
  publishIssueMessage,
} from "@/features/admin-dev-articles/_lib/dev-article-issue-message";
import { checkArticlePublishable } from "@/features/admin-dev-articles/_lib/dev-article-publish-check";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

/**
 * `assertArticlePublishable` 이 저장소 종류와 무관하게 받는 주변 데이터.
 * mock 은 localStorage 봉투에서, live 는 PostgREST projection 에서 같은 모양을 만든다.
 */
type ArticlePublishGuardContext = {
  /** slug 중복 검사 대상. 편집 중인 글이 들어 있어도 된다. */
  articles: Array<{ id: string; slug: string }>;
  /** 사전에 있는 태그 id. */
  knownTagIds: string[];
  /** 발행 가능한(존재하고 공개된) 프로젝트 id. */
  publishableProjectIds: string[];
};

/**
 * 입력을 저장 형태로 맞춘다. 최초 발행이면 그 시각을 한 번만 남긴다.
 *
 * 발행을 취소해도 기존 `firstPublishedAt` 은 지우지 않는다 — 값의 존재가
 * "발행된 적 있음 = slug 변경 금지" 의 근거라서다(07-dev-blog §2).
 *
 * @param input 폼이 만든 저장 필드.
 * @param previous 이전 저장본. 새 글이면 undefined.
 * @param now 시스템 시각. 테스트가 고정할 수 있게 주입받는다.
 * @returns 발행 시각을 정리한 저장 필드.
 */
const stampFirstPublished = (
  input: DevArticleInput,
  previous: { firstPublishedAt: Date | null } | undefined,
  now: () => Date,
): DevArticleInput => {
  const firstPublishedAt = previous?.firstPublishedAt ?? input.firstPublishedAt;
  if (firstPublishedAt || !input.published) return { ...input, firstPublishedAt };
  return { ...input, firstPublishedAt: now() };
};

/**
 * 발행 상태로 저장되는 모든 경로(폼 저장 `create`/`update` · 목록 토글 `setPublished`)가
 * 공유하는 최종 방어선. 폼의 검사는 참조 데이터(다른 글 목록)가 아직 로드 중이면 slug 중복을
 * 놓칠 수 있으므로, 저장소가 자기 데이터로 한 번 더 확인한다.
 *
 * 이 검사가 없으면 발행일 없는 초안이 `published: true` · `publishedAt: null` 로 넘어간다.
 * 폼에서는 막히는 상태이고, 공개 목록은 그 글의 날짜를 작성일로 대신 보여 주게 된다.
 *
 * @param id 발행하려는 글의 문서 ID. 자기 slug 를 중복으로 세지 않기 위해 쓴다.
 * @param input 발행하려는 저장 값.
 * @param context slug 중복·태그 사전·프로젝트 공개 여부를 볼 주변 데이터.
 * @throws {Error} 조건을 만족하지 않을 때. 문구는 폼과 같은 출처를 쓴다.
 */
const assertArticlePublishable = (
  id: string,
  input: DevArticleInput,
  context: ArticlePublishGuardContext,
): void => {
  const markdownIssues = parseArticleMarkdown(input.body).issues;
  const issues = checkArticlePublishable(
    { ...input, published: true },
    {
      articles: context.articles,
      selfId: id,
      markdownIssues,
      knownTagIds: context.knownTagIds,
      publishableProjectIds: context.publishableProjectIds,
    },
  );
  if (issues.length === 0) return;

  const reasons = issues
    .map((issue) =>
      issue.code === "markdown-blocked" && markdownIssues[0]
        ? markdownIssueMessage(markdownIssues[0])
        : publishIssueMessage(issue),
    )
    .join(" ");
  throw new Error(`발행 조건을 만족하지 않습니다. ${reasons}`);
};

export { assertArticlePublishable, stampFirstPublished };
