"use client";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";

import { devArticleRoute } from "@/constants/routes";
import { formatEventYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { resolveCurrentArticleSlug } from "@/lib/webmcp/current-target";
import { clampToolText, formatToolItems } from "@/lib/webmcp/tool-output";
import { idProperty, limitProperty, objectSchema, stringProperty } from "@/lib/webmcp/tool-schemas";

import type { ArticleToolData } from "@/features/dev-blog/_lib/article-tool-data";
import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { DevArticleTag } from "@/types/dev-article-tag";

const LIST_TOOL: WebMcpToolDefinition = {
  name: "list_blog_posts",
  description:
    "List published blog posts, or filter them by blog tag. Blog tags are a fixed set kept " +
    "for the blog, separate from photo tags and project tech stacks. Call with no arguments " +
    "to get every post plus the tags in use. Use this rather than search_portfolio whenever " +
    "the request names a tag: only this tool knows the tag list and can say that none match. " +
    "Returns each post's id, slug, publish date, reading time and page path.",
  inputSchema: objectSchema({
    tag: stringProperty(
      "Tag to filter by. The tag id or either its Korean or English label works, e.g. 'nextjs'.",
    ),
    limit: limitProperty(),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const GET_TOOL: WebMcpToolDefinition = {
  name: "get_blog_post",
  description:
    "Get one blog post's summary, tags and section outline without its full text. " +
    "Pass articleId or slug, not both. " +
    "Omit both to describe the post currently open on a post page.",
  inputSchema: objectSchema({
    articleId: idProperty("Post id from list_blog_posts results."),
    slug: stringProperty("Post slug from list_blog_posts results, e.g. 'serverless-portfolio'."),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

/**
 * 사전에 있는 태그를 id 와 두 언어 라벨로 나열한다.
 *
 * 태그를 못 맞힌 응답과 인자 없는 목록이 함께 쓴다. 어휘를 모르면 에이전트가 태그 질문을
 * 키워드 검색으로 돌리고, 없는 태그를 "없다" 로 답할 근거도 사라진다.
 *
 * @param {DevArticleTag[]} tags 태그 사전 전체.
 * @returns {string} `chatbot (챗봇 / Chatbot), …` 형태.
 */
const listKnownTags = (tags: DevArticleTag[]): string =>
  tags.map((entry) => `${entry.id} (${entry.ko} / ${entry.en})`).join(", ");

/**
 * 에이전트가 넘긴 문자열 인자를 정리한다. 공백만 있는 값은 넘기지 않은 것으로 본다.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
const trimmedArgument = (raw: unknown): string | null =>
  typeof raw === "string" && raw.trim() ? raw.trim() : null;

/**
 * 태그 id·한국어 라벨·영어 라벨 중 어느 쪽으로 물어도 찾는다.
 * "바다" 로 물어 `Sea` 태그를 찾은 W5 평가(3-4)와 같은 규칙이다.
 *
 * 부분 일치는 쓰지 않는다. 한두 글자 인자가 거의 모든 태그에 걸려 거르지 않은 목록이
 * 태그 결과인 것처럼 나간다.
 *
 * @param {ArticleToolData} article
 * @param {string} tag 에이전트가 넘긴 태그 인자.
 * @returns {boolean}
 */
const matchesTag = (article: ArticleToolData, tag: string): boolean => {
  const needle = tag.trim().toLowerCase();
  return [...article.tagIds, ...article.tagLabels].some(
    (value) => value.trim().toLowerCase() === needle,
  );
};

/**
 * 블로그 목록·상세 지면에서 글 조회 도구 두 개를 등록한다.
 *
 * 태그 사전을 글 목록과 따로 받는 이유는 아직 어느 글도 쓰지 않은 태그와 글이 0건일 때의
 * 사전을 글에서 뽑을 수 없기 때문이다. 0건 안내의 `Known tags:` 는 이 사전에서 만든다.
 *
 * @param {ArticleToolData[]} articles 서버가 투영한 공개 글. 발행일 내림차순.
 * @param {DevArticleTag[]} tags 블로그 태그 사전 전체.
 * @returns {void}
 */
const useBlogTools = (articles: ArticleToolData[], tags: DevArticleTag[]): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_TOOL, (args) => {
    let matched = articles;
    const tag = trimmedArgument(args.tag);
    if (tag) {
      matched = matched.filter((article) => matchesTag(article, tag));
      if (matched.length === 0) {
        return `No posts use "${tag}". Known tags: ${listKnownTags(tags)}.`;
      }
    }
    if (matched.length === 0) return "No blog posts are published yet.";

    const list = formatToolItems(matched, args.limit, (article) =>
      [
        pickText(article.title, lang),
        formatEventYMD(article.publishedAt),
        `${article.readingMinutes} min read`,
        article.id,
        article.slug,
        localizePath(lang, devArticleRoute(article.slug)),
      ]
        .filter(Boolean)
        .join(" · "),
    );
    // 태그를 지정하지 않은 호출은 어휘를 묻는 자리이기도 하다. 사전을 함께 준다.
    return tag || tags.length === 0 ? list : `${list}\nKnown tags: ${listKnownTags(tags)}.`;
  });

  useModelContextTool(GET_TOOL, (args) => {
    const articleId = trimmedArgument(args.articleId);
    const slug = trimmedArgument(args.slug);
    if (articleId && slug) {
      return "Pass either articleId or slug, not both.";
    }

    const currentSlug = articleId || slug ? null : resolveCurrentArticleSlug();
    if (!articleId && !slug && !currentSlug) {
      return "No post is open. Pass articleId or slug from list_blog_posts.";
    }

    const wanted = slug ?? currentSlug;
    const article = articleId
      ? articles.find((entry) => entry.id === articleId)
      : articles.find((entry) => entry.slug === wanted);
    if (!article) return "No published post matches that id or slug.";

    return clampToolText(
      [
        pickText(article.title, lang),
        `${article.id} · ${article.slug} · ${formatEventYMD(article.publishedAt)} · ${article.readingMinutes} min read`,
        pickText(article.summary, lang),
        article.tagLabels.length > 0 ? `Tags: ${article.tagLabels.join(", ")}` : "",
        article.headings.length > 0 ? `Outline: ${article.headings.join(" / ")}` : "",
        localizePath(lang, devArticleRoute(article.slug)),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  });
};

export { useBlogTools };
