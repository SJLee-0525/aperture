import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";
import { articleBlockText } from "@/features/dev-blog/_lib/article-plain-text";

import { getDevArticles } from "@/lib/content/dev-articles";

import type { DevArticle } from "@/types/dev-article";

/** 본문 일치 결과 — 결과 행 표시는 클라이언트 검색 인덱스의 문서가 맡고 여기는 일치 근거만 담는다. */
type ArticleBodyMatch = { id: string; snippet: string };

/** 이보다 짧은 질의는 본문 어디에나 닿아 결과가 소음이 된다. */
const MIN_QUERY_CHARS = 2;

const MAX_MATCHES = 20;

/** 일치 지점 앞뒤로 보여 줄 문자 수. */
const SNIPPET_RADIUS = 40;

/** 대소문자·유니코드 표기 차이를 흡수하는 대조용 정규화. */
const comparable = (text: string): string => text.normalize("NFC").toLowerCase();

const plainBody = (article: DevArticle): string =>
  analyzeArticle(article).document.blocks.map(articleBlockText).filter(Boolean).join("\n");

/**
 * 일치 지점 주변을 한 줄로 잘라낸다. 절단 위치를 표시하는 말줄임표는
 * 스니펫이 본문의 시작·끝이 아닐 때만 붙인다.
 */
const snippetAround = (body: string, index: number, queryLength: number): string => {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(body.length, index + queryLength + SNIPPET_RADIUS);
  const core = body.slice(start, end).replaceAll("\n", " ").trim();
  return `${start > 0 ? "…" : ""}${core}${end < body.length ? "…" : ""}`;
};

/**
 * 공개 글 본문(평문)에서 질의 부분 문자열 일치를 찾는다.
 *
 * 클라이언트 검색 인덱스는 전송량 때문에 제목·요약·태그·목차까지만 담는다 —
 * 본문 일치는 서버에서 대조하고 id·스니펫만 돌려줘 그 제약을 우회한다.
 * 글 목록은 ISR 캐시된 공개 getter 를 재사용하므로 질의당 DB 왕복이 없다.
 * 대조는 Markdown 원문이 아니라 렌더 평문 기준이라 URL·문법 기호에 닿지 않는다.
 *
 * @param {string} rawQuery 방문자 질의. 2자 미만은 대조하지 않는다.
 * @returns {Promise<ArticleBodyMatch[]>} 발행일 내림차순(getter 순서)의 일치 목록.
 */
const searchArticleBodies = async (rawQuery: string): Promise<ArticleBodyMatch[]> => {
  const query = comparable(rawQuery.trim());
  if (query.length < MIN_QUERY_CHARS) return [];
  const articles = await getDevArticles();
  const matches: ArticleBodyMatch[] = [];
  for (const article of articles) {
    const body = plainBody(article);
    const index = comparable(body).indexOf(query);
    if (index < 0) continue;
    matches.push({ id: article.id, snippet: snippetAround(body, index, query.length) });
    if (matches.length >= MAX_MATCHES) break;
  }
  return matches;
};

export { searchArticleBodies };
export type { ArticleBodyMatch };
