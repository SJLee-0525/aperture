import type {
  ArticleBlock,
  ArticleInline,
  ArticleListItem,
} from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 코드 블록 하나가 청크에서 차지할 수 있는 최대 길이.
 * 청크 예산과 같게 두면 코드 하나가 제목과 주변 설명을 전부 밀어낸다.
 */
const ARTICLE_CODE_BLOCK_MAX_CHARS = 400;

/** 표의 셀 구분자. 행 구분은 줄바꿈이 맡는다. */
const TABLE_CELL_SEPARATOR = " · ";

/**
 * 줄 안의 공백만 하나로 줄이고 빈 줄을 없앤다. 줄바꿈은 목록 항목과 표의 행 경계라 남긴다.
 *
 * @param {string} text
 * @returns {string}
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
 *
 * @param {ArticleInline[]} nodes
 * @returns {string}
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

const listItemsToPlainText = (items: ArticleListItem[]): string =>
  items
    .map((item) => item.children.map(blockToPlainText).filter(Boolean).join(" "))
    .filter(Boolean)
    .join("\n");

/**
 * 블록 하나를 평문 한 덩어리로 바꾼다. 값이 없는 블록은 빈 문자열이라 호출부가 걸러 낸다.
 *
 * 이미지는 대체 텍스트와 캡션만, YouTube 는 제목만 남긴다. 주소·영상 ID 는 검색어가 될 수 없다.
 *
 * @param {ArticleBlock} block
 * @returns {string} 평문. 목록 항목과 표의 행은 줄바꿈으로 나뉜다.
 */
const blockToPlainText = (block: ArticleBlock): string => {
  switch (block.type) {
    case "heading":
      return block.text;
    case "paragraph":
      return inlineToPlainText(block.children);
    case "list":
      return listItemsToPlainText(block.items);
    case "blockquote":
      return block.children.map(blockToPlainText).filter(Boolean).join("\n");
    case "table":
      return [block.header, ...block.rows]
        .map((cells) => cells.map(inlineToPlainText).join(TABLE_CELL_SEPARATOR))
        .map((row) => row.trim())
        .filter(Boolean)
        .join("\n");
    case "code": {
      const value = block.value.slice(0, ARTICLE_CODE_BLOCK_MAX_CHARS);
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
 * 블록 하나를 임베딩 입력에 넣을 형태로 평문화한다.
 *
 * @param {ArticleBlock} block
 * @returns {string} 공백을 정리한 평문. 담을 내용이 없으면 빈 문자열.
 */
const articleBlockText = (block: ArticleBlock): string =>
  normalizeWhitespace(blockToPlainText(block));

export { articleBlockText };
