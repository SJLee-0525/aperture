import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";

import type { ArticleCodeLines } from "@/features/dev-blog/_lib/markdown-highlight-map";
import type { CSSProperties } from "react";

import styles from "./ArticleCodeBlock.module.css";

type Props = {
  rawLanguage: string;
  value: string;
  tokens: ArticleCodeLines | null;
};

/**
 * 코드 블록 한 개. 색칠은 서버가 미리 끝내고 여기는 결과 색만 그린다.
 *
 * 하이라이터를 직접 부르지 않기 때문에 서버·브라우저 어디서 렌더해도 같다. 공개 상세는
 * 서버에서, 관리자 미리보기는 브라우저에서 이 컴포넌트를 쓰지만 두 경우 모두 문법은
 * 브라우저로 오지 않는다. 색이 없으면(모르는 언어이거나 색칠 실패) 원문을 그대로 보여 준다 —
 * 색 때문에 글이 안 열리면 안 된다.
 *
 * @param {Props} props
 * @param {string} props.rawLanguage 원문에 적힌 표기. 색과 무관하게 라벨로 노출한다.
 * @param {string} props.value 코드 원문. 색칠 결과가 없을 때 그대로 그린다.
 * @param {ArticleCodeLines | null} props.tokens 줄·토큰 배열. null 이면 색 없이 그린다.
 * @returns {JSX.Element}
 */
const ArticleCodeBlock = ({ rawLanguage, value, tokens }: Props) => (
  <HorizontalScrollArea
    as="pre"
    viewportClassName={styles.pre}
    dataLanguage={rawLanguage}
    codeBlock
  >
    <code>
      {tokens
        ? tokens.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line.map((token, tokenIndex) => (
                // 색은 `--shiki-light`·`--shiki-dark` 두 변수로만 온다. 테마를 바꿔도
                // 다시 색칠하지 않고 CSS 가 어느 변수를 읽을지만 바뀐다.
                <span key={tokenIndex} style={token.style as CSSProperties}>
                  {token.content}
                </span>
              ))}
              {lineIndex < tokens.length - 1 ? "\n" : null}
            </span>
          ))
        : value}
    </code>
  </HorizontalScrollArea>
);

export { ArticleCodeBlock };
