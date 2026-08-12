import type { CSSProperties } from "react";

import type { ArticleCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";
import { highlightArticleCode } from "@/features/dev-blog/_lib/markdown-highlight";

import styles from "./ArticleCodeBlock.module.css";

type Props = {
  language: ArticleCodeLanguage | null;
  rawLanguage: string;
  value: string;
};

/**
 * 코드 블록 한 개. 색칠은 서버에서만 하고 브라우저에는 결과 색만 보낸다.
 *
 * 비동기 Server Component 다 — 문법을 처음 쓰는 순간에만 읽어 오므로 렌더가 그 동안 기다린다.
 * 부모(`ArticleBody`)는 동기 컴포넌트로 두고 이 조각만 비동기라, 코드가 없는 글은 대기하지 않는다.
 * 색칠에 실패하거나 모르는 언어면 원문을 그대로 보여 준다 — 색 때문에 글이 안 열리면 안 된다.
 *
 * @param {Props} props
 * @param {ArticleCodeLanguage | null} props.language 정규화된 문법 이름. null 이면 색을 입히지 않는다.
 * @param {string} props.rawLanguage 원문에 적힌 표기. 색과 무관하게 라벨로 노출한다.
 * @param {string} props.value 코드 원문.
 * @returns {Promise<JSX.Element>}
 */
const ArticleCodeBlock = async ({ language, rawLanguage, value }: Props) => {
  const highlighted = language ? await highlightArticleCode(value, language) : null;

  return (
    <pre className={styles.pre} data-language={rawLanguage || undefined}>
      <code>
        {highlighted
          ? highlighted.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line.map((token, tokenIndex) => (
                  // 색은 `--shiki-light`·`--shiki-dark` 두 변수로만 온다. 테마를 바꿔도
                  // 다시 색칠하지 않고 CSS 가 어느 변수를 읽을지만 바뀐다.
                  <span key={tokenIndex} style={token.style as CSSProperties}>
                    {token.content}
                  </span>
                ))}
                {lineIndex < highlighted.length - 1 ? "\n" : null}
              </span>
            ))
          : value}
      </code>
    </pre>
  );
};

export { ArticleCodeBlock };
