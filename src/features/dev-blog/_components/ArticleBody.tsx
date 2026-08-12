import Link from "next/link";
import type { ReactNode } from "react";

import { ArticleCodeBlock } from "@/features/dev-blog/_components/ArticleCodeBlock";
import { ArticleYouTube } from "@/features/dev-blog/_components/ArticleYouTube";
import type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
} from "@/features/dev-blog/_lib/markdown-nodes";
import { localizePath } from "@/lib/i18n/locale-path";
import type { Lang } from "@/types/lang";

import styles from "./ArticleBody.module.css";

/** 새 탭으로 여는 링크에 붙인다. `noopener` 는 원본 탭 조작을, `noreferrer` 는 유입 경로 노출을 막는다. */
const EXTERNAL_LINK_REL = "noreferrer noopener";

const renderInlines = (nodes: ArticleInline[], lang: Lang): ReactNode[] =>
  nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return <strong key={index}>{renderInlines(node.children, lang)}</strong>;
      case "emphasis":
        return <em key={index}>{renderInlines(node.children, lang)}</em>;
      case "inlineCode":
        return (
          <code key={index} className={styles.inlineCode}>
            {node.value}
          </code>
        );
      case "break":
        return <br key={index} />;
      case "link": {
        const children = renderInlines(node.children, lang);
        // 내부 경로는 현재 언어 프리픽스를 붙여야 한다. 서버에서 렌더하므로 클라이언트
        // 훅에 기대는 LocalizedLink 대신 같은 계산을 하는 순수 함수를 쓴다.
        if (node.target === "internal") {
          return (
            <Link key={index} href={localizePath(lang, node.href)}>
              {children}
            </Link>
          );
        }
        return (
          <a
            key={index}
            href={node.href}
            {...(node.target === "external"
              ? { target: "_blank", rel: EXTERNAL_LINK_REL }
              : undefined)}
          >
            {children}
          </a>
        );
      }
    }
  });

const renderBlocks = (blocks: ArticleBlock[], lang: Lang): ReactNode[] =>
  blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        const Heading = `h${block.depth}` as const;
        return (
          <Heading key={index} id={block.id} className={styles.heading}>
            {renderInlines(block.children, lang)}
          </Heading>
        );
      }

      case "paragraph":
        return <p key={index}>{renderInlines(block.children, lang)}</p>;

      case "list": {
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderBlocks(item.children, lang)}</li>
        ));
        return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
      }

      case "blockquote":
        return (
          <blockquote key={index} className={styles.quote}>
            {renderBlocks(block.children, lang)}
          </blockquote>
        );

      case "thematicBreak":
        return <hr key={index} className={styles.rule} />;

      case "table":
        return (
          // 표는 좁은 화면에서 본문 폭을 넘기므로 스스로 가로 스크롤한다.
          <div key={index} className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    // 정렬은 관리자가 원문에 적은 값이라 토큰으로 표현할 수 없다.
                    <th key={cellIndex} style={{ textAlign: block.align[cellIndex] ?? undefined }}>
                      {renderInlines(cell, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{ textAlign: block.align[cellIndex] ?? undefined }}
                      >
                        {renderInlines(cell, lang)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "code":
        return (
          <ArticleCodeBlock
            key={index}
            language={block.language}
            rawLanguage={block.rawLanguage}
            value={block.value}
          />
        );

      case "image":
        return (
          <figure key={index} className={styles.figure}>
            {/* Markdown 은 이미지 크기를 담지 않아 next/image 에 넘길 비율이 없다.
                전역 설정이 이미 Vercel 최적화를 끄고 Storage 파일을 그대로 보내므로
                크기를 지어내기보다 브라우저에 맡긴다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.src} alt={block.alt} loading="lazy" decoding="async" />
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        );

      case "youtube":
        return (
          <ArticleYouTube
            key={index}
            videoId={block.videoId}
            title={block.title}
            source={block.source}
          />
        );
    }
  });

type Props = { document: ArticleDocument; lang: Lang };

/**
 * 검증을 통과한 본문 트리를 화면에 그린다. 공개 상세와 관리자 미리보기가 같은 컴포넌트를 쓴다.
 *
 * 여기서 다루는 노드 종류는 `markdown-nodes` 가 정의한 것이 전부다. 원문 문자열도 HTML 문자열도
 * 받지 않으므로 `dangerouslySetInnerHTML` 이 필요한 자리가 없고, 허용 목록 밖의 요소는 애초에
 * 이 함수까지 오지 않는다. 코드 블록만 비동기 조각으로 갈라져 서버에서 색을 입힌다.
 *
 * 본문은 한국어 원문 하나뿐이라 컨테이너에 `lang="ko"` 를 못 박는다. 영어 경로에서도 같은
 * 원문을 보여 주므로, 이 표시가 없으면 보조 기술과 브라우저 번역이 문서 언어를 잘못 읽는다.
 *
 * @param {Props} props
 * @param {ArticleDocument} props.document `parseArticleMarkdown` 이 만든 렌더 트리.
 * @param {Lang} props.lang 내부 링크에 붙일 언어 프리픽스. 본문 언어와는 별개다.
 * @returns {JSX.Element}
 */
const ArticleBody = ({ document, lang }: Props) => (
  <div className={styles.body} lang="ko">
    {renderBlocks(document.blocks, lang)}
  </div>
);

export { ArticleBody };
