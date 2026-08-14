import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";
import { articleBlockText } from "@/features/dev-blog/_lib/article-plain-text";

import { devArticleRoute } from "@/constants/routes";

import type { ArticleBlock } from "@/features/dev-blog/_lib/markdown-nodes";
import type { DevArticle } from "@/types/dev-article";
import type { RagChunk } from "@/types/rag";

/**
 * 청크 하나의 최대 길이. 임베딩 입력과 모델 문맥 예산을 함께 제한한다.
 * 넘는 만큼 잘라 버리지 않고 다음 청크로 넘겨 긴 글의 뒷부분도 검색에 남는다.
 */
const ARTICLE_CHUNK_MAX_CHARS = 1_200;

/**
 * 두 번째 part 부터 다시 붙이는 구간 제목의 최대 길이.
 * 제목이 길어도 본문에 남는 예산이 `ARTICLE_CHUNK_MAX_CHARS` 의 대부분을 유지한다.
 */
const HEADING_PREFIX_MAX_CHARS = 120;

/** 블로그 글은 개발 섹션 질문에서 검색된다. */
const ARTICLE_SECTION = "development" as const;
const ARTICLE_SOURCE_TYPE = "article";

const chunkId = (sourceId: string, chunkKey: string): string =>
  encodeURIComponent(`${ARTICLE_SECTION}:${ARTICLE_SOURCE_TYPE}:${sourceId}:${chunkKey}`);

/**
 * 상한을 넘는 단일 조각을 공백 경계 우선으로 나눈다.
 * 공백이 없는 긴 토큰(주소·해시)은 문자 단위로 자른다.
 *
 * @param {string} text
 * @param {number} limit 조각 하나의 최대 길이. 1 미만이면 1로 올린다.
 * @returns {string[]} 각 조각이 상한 이하인 목록.
 */
const splitOversized = (text: string, limit: number): string[] => {
  // 상한이 0 이하이면 잘라 낼 길이가 없어 남은 문자열이 줄지 않고 루프가 끝나지 않는다.
  const safeLimit = Math.max(1, limit);
  const parts: string[] = [];
  let rest = text;
  while (rest.length > safeLimit) {
    const window = rest.slice(0, safeLimit);
    const boundary = Math.max(window.lastIndexOf(" "), window.lastIndexOf("\n"));
    const cut = boundary > 0 ? boundary : safeLimit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
};

/**
 * 조각들을 상한 안에서 이어 붙인다. 블록 경계를 먼저 지키고, 한 조각이 혼자 상한을 넘을 때만 나눈다.
 *
 * 첫 part 만 상한이 다를 수 있다. 뒤따르는 part 에만 구간 제목을 다시 붙이는 호출부가
 * 첫 part 까지 제목만큼 깎지 않게 한다.
 *
 * @param {string[]} pieces 평문화를 마친 블록 텍스트.
 * @param {number} limit 두 번째 이후 part 의 최대 길이.
 * @param {number} [firstLimit] 첫 part 의 최대 길이. 생략하면 `limit` 과 같다.
 * @returns {string[]} 각 원소가 자기 상한 이하인 part 목록.
 */
const packParts = (pieces: string[], limit: number, firstLimit: number = limit): string[] => {
  const parts: string[] = [];
  let current = "";
  const flush = () => {
    if (current) parts.push(current);
    current = "";
  };
  const limitNow = () => (parts.length === 0 ? firstLimit : limit);
  // 한 조각을 나눌 때는 두 상한 중 작은 쪽을 쓴다. 나눈 뒤 part 가 넘어가도 조각이 상한을 넘지 않는다.
  const splitLimit = Math.min(limit, firstLimit);

  for (const piece of pieces) {
    const units = piece.length > splitLimit ? splitOversized(piece, splitLimit) : [piece];
    for (const unit of units) {
      const next = current ? `${current}\n${unit}` : unit;
      if (next.length > limitNow()) {
        flush();
        current = unit;
      } else {
        current = next;
      }
    }
  }
  flush();
  return parts;
};

type ArticleSection = { heading: string; blocks: ArticleBlock[] };

/**
 * 본문을 h2 기준의 논리 구간으로 나눈다. 첫 h2 앞의 서두도 하나의 구간이다.
 *
 * @param {ArticleBlock[]} blocks
 * @returns {ArticleSection[]}
 */
const toSections = (blocks: ArticleBlock[]): ArticleSection[] => {
  const sections: ArticleSection[] = [{ heading: "", blocks: [] }];
  for (const block of blocks) {
    if (block.type === "heading" && block.depth === 2) {
      sections.push({ heading: block.text, blocks: [block] });
      continue;
    }
    sections[sections.length - 1].blocks.push(block);
  }
  return sections;
};

/**
 * 공개된 글 하나를 RAG 청크로 나눈다.
 *
 * `meta` 청크는 제목·요약·태그와 함께 slug 와 상세 경로를 담는다. 프롬프트에는
 * `[article:{id}] …` 형태로 실리므로 챗봇이 이 청크만 보고도 글의 주소를 알 수 있다.
 * 본문은 h2 구간마다 나누고, 구간이 길면 블록 경계를 지키며 여러 part 로 이어 간다.
 * 각 part 앞에 구간 제목을 반복해 중간 part 도 어느 절인지 알 수 있게 한다.
 *
 * 청크 키가 순번이라 heading 을 중간에 추가하면 뒤따르는 청크 ID 가 모두 바뀐다.
 * 바뀐 ID 는 재임베딩되고 남은 ID 는 같은 글 범위의 stale 삭제가 정리한다.
 *
 * @param {DevArticle} article 공개된 글. 초안은 빈 배열을 돌려준다.
 * @param {string[]} tagLabels 태그 사전에서 편 라벨.
 * @returns {RagChunk[]} 각 청크의 길이는 `ARTICLE_CHUNK_MAX_CHARS` 이하다.
 */
const articleRagChunks = (article: DevArticle, tagLabels: string[]): RagChunk[] => {
  if (!article.published) return [];

  const path = devArticleRoute(article.slug);
  const chunk = (chunkKey: string, text: string): RagChunk => ({
    id: chunkId(article.id, chunkKey),
    section: ARTICLE_SECTION,
    sourceType: ARTICLE_SOURCE_TYPE,
    sourceId: article.id,
    chunkKey,
    text,
  });

  const meta = [
    `글/Article: ${article.title.ko} / ${article.title.en}`,
    `${article.summary.ko} / ${article.summary.en}`,
    tagLabels.length > 0 ? `태그/Tags: ${tagLabels.join(", ")}` : "",
    `slug: ${article.slug}`,
    `경로/Path: ${path}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const chunks = packParts([meta], ARTICLE_CHUNK_MAX_CHARS).map((text, index) =>
    chunk(index === 0 ? "meta" : `meta-${index}`, text),
  );

  toSections(analyzeArticle(article).document.blocks).forEach((section, sectionIndex) => {
    const pieces = section.blocks.map(articleBlockText).filter(Boolean);
    if (pieces.length === 0) return;
    // 두 번째 part 부터 구간 제목을 다시 붙이므로 그만큼을 미리 빼고 채운다.
    // 첫 part 에는 붙이지 않으므로 상한을 그대로 준다.
    const prefix = section.heading ? `${section.heading.slice(0, HEADING_PREFIX_MAX_CHARS)}\n` : "";
    const parts = packParts(
      pieces,
      ARTICLE_CHUNK_MAX_CHARS - prefix.length,
      ARTICLE_CHUNK_MAX_CHARS,
    );
    parts.forEach((text, partIndex) => {
      // 첫 part 는 제목 블록으로 시작하므로 다시 붙이지 않는다.
      chunks.push(
        chunk(`h-${sectionIndex}-${partIndex}`, partIndex > 0 ? `${prefix}${text}` : text),
      );
    });
  });

  return chunks;
};

export { ARTICLE_CHUNK_MAX_CHARS, articleRagChunks };
