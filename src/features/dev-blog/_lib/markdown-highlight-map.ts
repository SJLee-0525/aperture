import type { ArticleCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";

/**
 * 색칠 결과를 렌더러에 넘기는 자료형.
 *
 * 색칠은 `shiki` 가 서버에서만 하지만 본문 렌더러는 공개 상세(서버)와 관리자 미리보기
 * (브라우저) 양쪽에서 돈다. 그래서 결과를 담는 이 형과 조회 키만 `server-only` 밖에 두고,
 * `markdown-highlight` 는 이 형을 채우는 쪽에만 남긴다. 렌더러가 하이라이터를 직접
 * 부르지 않으므로 브라우저 번들에 문법이 딸려 들어갈 경로가 없다.
 */

/** 색 한 조각. `style` 은 `--shiki-light`·`--shiki-dark` 두 CSS 변수를 담는다. */
type ArticleCodeToken = { content: string; style: Record<string, string> };

/** 줄 단위 토큰. 빈 줄은 빈 배열이다. */
type ArticleCodeLines = ArticleCodeToken[][];

/** 코드 블록 조회 키 → 색칠 결과. 색칠하지 않은 블록은 키 자체가 없다. */
type ArticleCodeHighlights = Record<string, ArticleCodeLines>;

/** 언어와 원문 사이 구분자. 정규화된 언어 이름에는 콜론이 없어 앞뒤가 섞이지 않는다. */
const KEY_SEPARATOR = ":";

/**
 * 코드 블록의 조회 키를 만든다.
 *
 * 문서 안 위치가 아니라 내용으로 키를 잡는다. 코드 블록은 목록·인용 안에도 들어가므로
 * 순서 번호로 맞추면 렌더 순서와 색칠 순서가 어긋날 수 있고, 같은 코드가 두 번 나오면
 * 내용 키가 한 번만 색칠하게 해 준다.
 *
 * @param {ArticleCodeLanguage} language 정규화된 문법 이름.
 * @param {string} value 코드 원문.
 * @returns {string} 색칠 결과 map 의 키.
 */
const articleCodeHighlightKey = (language: ArticleCodeLanguage, value: string): string =>
  `${language}${KEY_SEPARATOR}${value}`;

export { articleCodeHighlightKey };
export type { ArticleCodeHighlights, ArticleCodeLines };
