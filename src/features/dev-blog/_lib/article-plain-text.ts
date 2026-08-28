import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";

import { truncateUtf16Safely } from "@/lib/text/truncate-utf16-safely";

import type {
  ArticleBlock,
  ArticleInline,
  ArticleListItem,
} from "@/features/dev-blog/_lib/markdown-nodes";
import type { DevArticle } from "@/types/dev-article";

/**
 * 평문화 옵션. `codeMaxChars` 를 생략하면 코드 블록을 자르지 않는다 —
 * 절단 상한은 예산이 있는 소비자(RAG 청크)만 자기 근거와 함께 지정한다.
 */
type ArticlePlainTextOptions = { codeMaxChars?: number };

/** 표의 셀 구분자. 행 구분은 줄바꿈이 맡는다. */
const TABLE_CELL_SEPARATOR = " · ";

/**
 * 줄 안의 공백만 하나로 줄이고 빈 줄을 없앤다. 줄바꿈은 목록 항목과 표의 행 경계라 남긴다.
 */
const normalizeWhitespace = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

/**
 * 인라인 노드를 평문으로 편다. 링크는 라벨만 남기고 주소는 버린다 —
 * URL 은 임베딩에서 의미를 만들지 않으면서 예산만 쓴다.
 */
const inlineToPlainText = (nodes: ArticleInline[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "inlineCode":
          return node.value;
        case "break":
          return " ";
        default:
          return inlineToPlainText(node.children);
      }
    })
    .join("");

const listItemsToPlainText = (items: ArticleListItem[], options: ArticlePlainTextOptions): string =>
  items
    .map((item) =>
      item.children
        .map((child) => blockToPlainText(child, options))
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join("\n");

/**
 * 블록 하나를 평문 한 덩어리로 바꾼다. 값이 없는 블록은 빈 문자열이라 호출부가 걸러 낸다.
 *
 * 이미지는 대체 텍스트와 캡션만, YouTube 는 제목만 남긴다. 주소·영상 ID 는 검색어가 될 수 없다.
 * 목록 항목과 인용문은 재귀라 옵션을 그대로 넘긴다 — 최상위에서만 적용하면
 * 중첩된 코드 블록이 옵션을 무시한다.
 *
 * @returns 평문. 목록 항목과 표의 행은 줄바꿈으로 나뉜다.
 */
const blockToPlainText = (block: ArticleBlock, options: ArticlePlainTextOptions): string => {
  switch (block.type) {
    case "heading":
      return block.text;
    case "paragraph":
      return inlineToPlainText(block.children);
    case "list":
      return listItemsToPlainText(block.items, options);
    case "blockquote":
      return block.children
        .map((child) => blockToPlainText(child, options))
        .filter(Boolean)
        .join("\n");
    case "table":
      return [block.header, ...block.rows]
        .map((cells) => cells.map(inlineToPlainText).join(TABLE_CELL_SEPARATOR))
        .map((row) => row.trim())
        .filter(Boolean)
        .join("\n");
    case "code": {
      const value =
        options.codeMaxChars === undefined
          ? block.value
          : block.value.slice(0, options.codeMaxChars);
      return block.rawLanguage ? `code(${block.rawLanguage}): ${value}` : `code: ${value}`;
    }
    case "image":
      return [block.alt, block.caption].filter(Boolean).join(" ");
    case "youtube":
      return block.title;
    default:
      return "";
  }
};

/**
 * 블록 하나를 평문화한다.
 *
 * @param [options] 생략하면 코드 블록을 자르지 않는다.
 * @returns 공백을 정리한 평문. 담을 내용이 없으면 빈 문자열.
 */
const articleBlockText = (block: ArticleBlock, options: ArticlePlainTextOptions = {}): string =>
  normalizeWhitespace(blockToPlainText(block, options));

/**
 * 글 본문 전체의 평문. 챗 화면 문맥과 본문 검색이 같은 문자열을 쓴다.
 *
 * @param article 평문화할 글.
 * @param [options] 생략하면 코드 블록을 자르지 않는다.
 * @returns 블록 단위 줄바꿈으로 이어 붙인 본문 평문.
 */
const articlePlainText = (article: DevArticle, options: ArticlePlainTextOptions = {}): string =>
  analyzeArticle(article)
    .document.blocks.map((block) => articleBlockText(block, options))
    .filter(Boolean)
    .join("\n");

/**
 * 예산 안에서 블록 경계까지만 담은 본문 평문.
 *
 * 문자 단위로 자르면 마크다운 토막이 남는다. 첫 블록부터 예산을 넘으면(거대 코드 블록)
 * 그 블록만 예산 길이로 자르며, 이때도 서로게이트 페어는 쪼개지 않는다.
 *
 * @param article 평문화할 글.
 * @param maxChars 담을 수 있는 최대 문자 수.
 * @returns 평문과 전문이 다 실렸는지 여부.
 */
const articlePlainTextClipped = (
  article: DevArticle,
  maxChars: number,
): { text: string; complete: boolean } => {
  const blocks = analyzeArticle(article)
    .document.blocks.map((block) => articleBlockText(block))
    .filter(Boolean);
  const full = blocks.join("\n");
  if (full.length <= maxChars) return { text: full, complete: true };

  const kept: string[] = [];
  let length = 0;
  for (const block of blocks) {
    const next = length + (kept.length > 0 ? 1 : 0) + block.length;
    if (next > maxChars) break;
    kept.push(block);
    length = next;
  }
  if (kept.length === 0) kept.push(truncateUtf16Safely(blocks[0] ?? "", maxChars));
  return { text: kept.join("\n"), complete: false };
};

export { articleBlockText, articlePlainText, articlePlainTextClipped };
export type { ArticlePlainTextOptions };
