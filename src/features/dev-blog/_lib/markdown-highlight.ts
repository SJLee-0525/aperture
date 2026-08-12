import "server-only";

import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import type { ArticleCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";
import {
  articleCodeHighlightKey,
  type ArticleCodeHighlights,
  type ArticleCodeLines,
} from "@/features/dev-blog/_lib/markdown-highlight-map";
import type { ArticleBlock, ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 라이트·다크 한 쌍. 두 테마를 함께 토큰화해 색을 CSS 변수로 받으므로
 * 테마를 바꿔도 다시 색칠하지 않고 변수만 갈아 끼운다.
 */
const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark";

/**
 * 문법은 쓰이는 순간에만 읽는다. 동적 `import()` 의 인자를 변수로 만들면 번들러가 대상을
 * 추적하지 못하므로 언어마다 한 줄씩 적어 둔다.
 */
const LANGUAGE_LOADERS: Record<ArticleCodeLanguage, () => Promise<unknown>> = {
  javascript: () => import("@shikijs/langs/javascript"),
  jsx: () => import("@shikijs/langs/jsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  tsx: () => import("@shikijs/langs/tsx"),
  java: () => import("@shikijs/langs/java"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  python: () => import("@shikijs/langs/python"),
  bash: () => import("@shikijs/langs/bash"),
  json: () => import("@shikijs/langs/json"),
  css: () => import("@shikijs/langs/css"),
  sql: () => import("@shikijs/langs/sql"),
};

let highlighter: Promise<HighlighterCore> | null = null;
const loadedLanguages = new Map<ArticleCodeLanguage, Promise<void>>();

/**
 * 하이라이터는 문법·테마를 메모리에 올려 두고 재사용한다. 요청마다 만들면 wasm 초기화가
 * 매번 반복돼 정적 생성 시간이 글 수만큼 늘어난다. Promise 를 캐시해 동시 호출도 한 번만 만든다.
 *
 * @returns {Promise<HighlighterCore>} 테마 두 개만 올라간 하이라이터.
 */
const getHighlighter = (): Promise<HighlighterCore> => {
  highlighter ??= createHighlighterCore({
    themes: [import("@shikijs/themes/github-light"), import("@shikijs/themes/github-dark")],
    langs: [],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
  return highlighter;
};

const ensureLanguage = (core: HighlighterCore, language: ArticleCodeLanguage): Promise<void> => {
  const loading =
    loadedLanguages.get(language) ??
    LANGUAGE_LOADERS[language]().then(async (module) => {
      await core.loadLanguage(module as Parameters<HighlighterCore["loadLanguage"]>[0]);
    });
  loadedLanguages.set(language, loading);
  return loading;
};

/**
 * 코드 한 덩어리를 색이 붙은 토큰으로 바꾼다.
 *
 * 서버에서만 돈다(`server-only`). 브라우저로 문법을 보내지 않는 것이 이 단계를 따로 둔 이유이고,
 * 결과는 문자열이 아니라 토큰 배열이라 렌더가 HTML 을 이어 붙이지 않는다.
 *
 * @param {string} code 코드 원문.
 * @param {ArticleCodeLanguage} language 정규화된 문법 이름.
 * @returns {Promise<ArticleCodeLines | null>} 줄·토큰 배열. 색칠에 실패하면 null 이고
 *   호출부는 색 없는 코드 블록으로 그대로 보여 준다 — 색 때문에 글이 통째로 안 열리면 안 된다.
 */
const highlightArticleCode = async (
  code: string,
  language: ArticleCodeLanguage,
): Promise<ArticleCodeLines | null> => {
  try {
    const core = await getHighlighter();
    await ensureLanguage(core, language);

    const { tokens } = core.codeToTokens(code, {
      lang: language,
      themes: { light: LIGHT_THEME, dark: DARK_THEME },
      // 기본 색을 인라인 `color` 로 박지 않아야 두 테마가 CSS 변수 한 쌍으로만 갈린다.
      defaultColor: false,
    });

    return tokens.map((line) =>
      line.map((token) => ({ content: token.content, style: token.htmlStyle ?? {} })),
    );
  } catch {
    return null;
  }
};

/**
 * 블록 트리를 훑어 색칠할 코드 블록을 모은다. 목록·인용 안에 들어간 코드도 빠뜨리지 않는다.
 *
 * @param {ArticleBlock[]} blocks 훑을 블록 목록.
 * @param {Map<string, { language: ArticleCodeLanguage; value: string }>} found 키로 중복을 거른 결과.
 * @returns {void} `found` 를 채운다.
 */
const collectCodeBlocks = (
  blocks: ArticleBlock[],
  found: Map<string, { language: ArticleCodeLanguage; value: string }>,
): void => {
  blocks.forEach((block) => {
    if (block.type === "code") {
      // 언어를 모르는 블록은 색을 입히지 않는다 — 원문 그대로 보여 주는 것이 계약이다.
      if (block.language) {
        found.set(articleCodeHighlightKey(block.language, block.value), {
          language: block.language,
          value: block.value,
        });
      }
      return;
    }
    if (block.type === "blockquote") collectCodeBlocks(block.children, found);
    if (block.type === "list")
      block.items.forEach((item) => collectCodeBlocks(item.children, found));
  });
};

/**
 * 글 하나의 코드 블록을 한 번에 색칠한다.
 *
 * 렌더러는 `shiki` 를 부르지 않고 이 결과를 조회만 하므로, 색칠을 이 함수 호출부(공개 상세
 * 서버 렌더, 관리자 미리보기 action)에만 묶어 둘 수 있다. 같은 코드가 여러 번 나오면 키가
 * 겹쳐 한 번만 색칠한다. 색칠에 실패한 블록은 결과에 키가 없고 렌더러가 원문을 그대로 그린다.
 *
 * @param {ArticleDocument} document 정규화된 본문.
 * @returns {Promise<ArticleCodeHighlights>} 조회 키 → 줄·토큰 배열. 코드가 없으면 빈 객체.
 */
const highlightArticleDocument = async (
  document: ArticleDocument,
): Promise<ArticleCodeHighlights> => {
  const found = new Map<string, { language: ArticleCodeLanguage; value: string }>();
  collectCodeBlocks(document.blocks, found);

  const entries = await Promise.all(
    [...found].map(async ([key, { language, value }]) => {
      const lines = await highlightArticleCode(value, language);
      return lines ? ([key, lines] as const) : null;
    }),
  );

  return Object.fromEntries(entries.filter((entry) => entry !== null));
};

export { highlightArticleCode, highlightArticleDocument };
