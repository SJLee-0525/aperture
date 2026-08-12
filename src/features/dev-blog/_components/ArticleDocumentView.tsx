import { ArticleBody } from "@/features/dev-blog/_components/ArticleBody";
import type { ArticleCodeHighlights } from "@/features/dev-blog/_lib/markdown-highlight-map";
import type { ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";
import { articleReadingMinutes } from "@/features/dev-blog/_lib/markdown-reading-time";

import { formatYMD } from "@/lib/format/format-date";

import type { Lang } from "@/types/lang";

import styles from "./ArticleDocumentView.module.css";

type Props = {
  title: string;
  summary: string;
  publishedAt: Date | null;
  updatedAt: Date;
  tags: string[];
  document: ArticleDocument;
  highlights: ArticleCodeHighlights;
  lang: Lang;
};

/**
 * 글 한 편의 지면 — 제목·요약·발행 정보·태그 다음에 본문.
 *
 * 관리자 전체 미리보기가 첫 소비처다. 편집기 옆 미리보기가 본문만 보여 주는 것과 달리
 * 여기서는 제목과 metadata 까지 붙여 실제 지면에 얹었을 때의 위계를 확인한다.
 *
 * 읽기 시간은 저장하지 않고 본문에서 계산한다(계획 §2) — 목록·상세·미리보기가 같은 함수를 쓴다.
 * 대표 이미지 hero 와 floating 목차는 여기 없다. 공개 상세를 만드는 단계에서 이 컴포넌트를
 * 감싸는 형태로 더한다.
 *
 * @param {Props} props
 * @param {string} props.title 현재 언어로 고른 제목.
 * @param {string} props.summary 현재 언어로 고른 요약.
 * @param {Date | null} props.publishedAt 발행일. 초안이면 null 이고 "초안"으로 표시한다.
 * @param {Date} props.updatedAt 마지막 수정 시각.
 * @param {string[]} props.tags 태그 라벨. id 가 아니라 화면에 그대로 쓸 문자열이다.
 * @param {ArticleDocument} props.document 정규화된 본문.
 * @param {ArticleCodeHighlights} props.highlights 서버가 미리 만든 색칠 결과.
 * @param {Lang} props.lang 본문 안 내부 링크에 붙일 언어 프리픽스.
 * @returns {JSX.Element}
 */
const ArticleDocumentView = ({
  title,
  summary,
  publishedAt,
  updatedAt,
  tags,
  document,
  highlights,
  lang,
}: Props) => (
  <article className={styles.article}>
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {summary ? <p className={styles.summary}>{summary}</p> : null}

      <p className={styles.meta}>
        <span>{publishedAt ? formatYMD(publishedAt) : "초안"}</span>
        <span aria-hidden="true">·</span>
        <span>수정 {formatYMD(updatedAt)}</span>
        <span aria-hidden="true">·</span>
        <span>{articleReadingMinutes(document)}분</span>
      </p>

      {tags.length > 0 ? (
        <ul className={styles.tags}>
          {tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </header>

    <ArticleBody document={document} lang={lang} highlights={highlights} />
  </article>
);

export { ArticleDocumentView };
