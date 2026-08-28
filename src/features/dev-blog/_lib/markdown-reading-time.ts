import type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
} from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 분당 처리량. [Medium 의 공개 기준](https://help.medium.com/hc/en-us/articles/214991667-Read-time)인
 * 한중일 500자·그 밖의 언어 265단어를 그대로 쓰고, 개발 글이라 코드 읽는 시간을 따로 더한다.
 * 코드 20줄/분은 같은 길이의 산문보다 느리게 읽힌다는 가정이며 근거가 생기면 이 값만 바꾼다.
 */
const CJK_CHARACTERS_PER_MINUTE = 500;
const WORDS_PER_MINUTE = 265;
const CODE_LINES_PER_MINUTE = 20;

/**
 * 한글(자모·완성형)·한자·가나. 띄어쓰기 없이 이어지는 글자라 단어가 아니라 글자 수로 센다.
 * `match` 와 `replace` 모두 global 로만 쓰므로 lastIndex 가 호출 사이에 남지 않는다.
 */
const CJK_CHARACTER = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿]/g;

/** 글자나 숫자가 하나도 없는 조각(구두점·기호만)은 단어로 세지 않는다. */
const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

const inlineText = (nodes: ArticleInline[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "inlineCode":
          return node.value;
        case "break":
          return " ";
        default:
          return inlineText(node.children);
      }
    })
    .join("");

type TextAndCode = { text: string; codeLines: number };

const collect = (blocks: ArticleBlock[]): TextAndCode =>
  blocks.reduce<TextAndCode>(
    (total, block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
          return { ...total, text: `${total.text} ${inlineText(block.children)}` };
        case "list": {
          const nested = collect(block.items.flatMap((item) => item.children));
          return {
            text: `${total.text} ${nested.text}`,
            codeLines: total.codeLines + nested.codeLines,
          };
        }
        case "blockquote": {
          const nested = collect(block.children);
          return {
            text: `${total.text} ${nested.text}`,
            codeLines: total.codeLines + nested.codeLines,
          };
        }
        case "table": {
          const cells = [...block.header, ...block.rows.flat()];
          return { ...total, text: `${total.text} ${cells.map(inlineText).join(" ")}` };
        }
        case "code": {
          const lines = block.value.split("\n").filter((line) => line.trim()).length;
          return { ...total, codeLines: total.codeLines + lines };
        }
        // 이미지 대체 텍스트·캡션·영상 제목은 읽는 시간이 아니라 보는 시간이고,
        // 감상 시간은 방문자마다 크게 달라 추정에 넣지 않는다.
        default:
          return total;
      }
    },
    { text: "", codeLines: 0 },
  );

/**
 * 본문에서 예상 읽기 시간을 계산한다. 목록·상세·관리자 미리보기가 같은 값을 쓰도록
 * 화면이 아니라 렌더 트리를 입력으로 받는다.
 *
 * Markdown 표식·링크 주소·코드 fence 표식은 트리에 남아 있지 않아 자연히 빠진다.
 *
 * @param document 정규화된 본문.
 * @returns 올림한 분 단위. 아무리 짧아도 1 이다.
 */
const articleReadingMinutes = (document: ArticleDocument): number => {
  const { text, codeLines } = collect(document.blocks);
  const cjk = text.match(CJK_CHARACTER)?.length ?? 0;
  const words = text
    .replace(CJK_CHARACTER, " ")
    .split(/\s+/)
    .filter((word) => HAS_LETTER_OR_NUMBER.test(word)).length;

  const minutes =
    cjk / CJK_CHARACTERS_PER_MINUTE + words / WORDS_PER_MINUTE + codeLines / CODE_LINES_PER_MINUTE;

  return Math.max(1, Math.ceil(minutes));
};

export { articleReadingMinutes };
