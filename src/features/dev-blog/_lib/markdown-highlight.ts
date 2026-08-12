import "server-only";

import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import type { ArticleCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";

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

/** 색 한 조각. `style` 은 `--shiki-light`·`--shiki-dark` 두 CSS 변수를 담는다. */
type HighlightedToken = { content: string; style: Record<string, string> };

/** 줄 단위 토큰. 빈 줄은 빈 배열이다. */
type HighlightedCode = HighlightedToken[][];

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
 * @returns {Promise<HighlightedCode | null>} 줄·토큰 배열. 색칠에 실패하면 null 이고
 *   호출부는 색 없는 코드 블록으로 그대로 보여 준다 — 색 때문에 글이 통째로 안 열리면 안 된다.
 */
const highlightArticleCode = async (
  code: string,
  language: ArticleCodeLanguage,
): Promise<HighlightedCode | null> => {
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

export { highlightArticleCode };
