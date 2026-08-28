import { articlePlainText } from "@/features/dev-blog/_lib/article-plain-text";

import { getDevArticles } from "@/lib/content/dev-articles";

import type { DevArticle } from "@/types/dev-article";

/** 본문 일치 결과 — 결과 행 표시는 클라이언트 검색 인덱스의 문서가 맡고 여기는 일치 근거만 담는다. */
type ArticleBodyMatch = { id: string; snippet: string };

/** 이보다 짧은 질의는 본문 어디에나 닿아 결과가 소음이 된다. */
const MIN_QUERY_CHARS = 2;

/** 무인증 공개 엔드포인트라 실수·자동 요청의 대조 비용을 묶는다. 초과 질의는 빈 결과다. */
const MAX_QUERY_CHARS = 100;

/**
 * 반환 일치 수 상한. 글 수가 이 값을 넘으면 뒷글의 일치가 조용히 잘리며,
 * 잘린 사실은 응답에 드러나지 않는다 — 결과 스키마를 바꾸지 않는 대신 감수하는 제약.
 */
const MAX_MATCHES = 20;

/** 일치 지점 앞뒤로 보여 줄 문자 수. */
const SNIPPET_RADIUS = 40;

/**
 * 대소문자·유니코드 표기 차이를 흡수하는 대조용 폴딩.
 * 본문 폴딩(`cachedBody`)과 같은 로케일을 써야 양쪽 결과가 일치한다.
 */
const comparable = (text: string): string => text.normalize("NFC").toLocaleLowerCase("ko-KR");

/**
 * 글별 평문·폴딩 캐시. `analyzeArticle` 의 React cache 는 요청 단위라 고유 질의마다
 * 전 글을 재파싱한다. `updatedAt` 이 버전 키라 stale 이 없고, ID 당 최신 1건만
 * 덮어써 크기가 글 수에 묶인다.
 */
const bodyCache = new Map<string, { updatedAt: number; normalized: string; folded: string }>();

const cachedBody = (article: DevArticle): { normalized: string; folded: string } => {
  const updatedAt = article.updatedAt.getTime();
  const hit = bodyCache.get(article.id);
  if (hit?.updatedAt === updatedAt) return hit;
  const normalized = articlePlainText(article).normalize("NFC");
  const entry = { updatedAt, normalized, folded: normalized.toLocaleLowerCase("ko-KR") };
  bodyCache.set(article.id, entry);
  return entry;
};

/** 삭제·비공개 전환된 글의 캐시 항목을 정리한다. */
const pruneBodyCache = (articles: readonly DevArticle[]): void => {
  const liveIds = new Set(articles.map(({ id }) => id));
  for (const id of bodyCache.keys()) {
    if (!liveIds.has(id)) bodyCache.delete(id);
  }
};

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
 * 일치 인덱스는 폴딩본에서 얻으므로, 폴딩이 길이를 바꾸면(케이스 폴딩 확장 등)
 * 원문 위치에 대응시킬 수 없어 본문 서두 스니펫으로 물러난다 —
 * `splitTextByMatches` 의 길이 불일치 가드와 같은 계약이다.
 *
 * @param rawQuery 방문자 질의. 2자 미만이거나 100자 초과면 대조하지 않는다.
 * @returns 발행일 내림차순(getter 순서)의 일치 목록.
 */
const searchArticleBodies = async (rawQuery: string): Promise<ArticleBodyMatch[]> => {
  const query = comparable(rawQuery.trim());
  if (query.length < MIN_QUERY_CHARS || query.length > MAX_QUERY_CHARS) return [];
  const articles = await getDevArticles();
  pruneBodyCache(articles);
  const matches: ArticleBodyMatch[] = [];
  for (const article of articles) {
    const { normalized, folded } = cachedBody(article);
    const index = folded.indexOf(query);
    if (index < 0) continue;
    const snippet =
      folded.length === normalized.length
        ? snippetAround(normalized, index, query.length)
        : `${normalized
            .slice(0, SNIPPET_RADIUS * 2)
            .replaceAll("\n", " ")
            .trim()}…`;
    matches.push({ id: article.id, snippet });
    if (matches.length >= MAX_MATCHES) break;
  }
  return matches;
};

export { searchArticleBodies };
export type { ArticleBodyMatch };
