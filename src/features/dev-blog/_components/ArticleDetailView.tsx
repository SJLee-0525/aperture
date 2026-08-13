"use client";

import { ArticleBody } from "@/features/dev-blog/_components/ArticleBody";
import { ArticleHero } from "@/features/dev-blog/_components/ArticleHero";
import { ArticleToc } from "@/features/dev-blog/_components/ArticleToc";

import { buildArticleToc } from "@/features/dev-blog/_lib/markdown-toc";

import { DICTIONARY } from "@/constants/dictionary";

import type { ArticleCodeHighlights } from "@/features/dev-blog/_lib/markdown-highlight-map";
import type { ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";
import type { ImageMeta } from "@/types/image";
import type { Lang } from "@/types/lang";
import type { ReactNode } from "react";

import styles from "./ArticleDetailView.module.css";

type Props = {
  title: string;
  summary: string;
  cover: ImageMeta | null;
  coverAlt: string;
  publishedAt: Date | null;
  readingMinutes: number;
  tagLabels: string[];
  document: ArticleDocument;
  highlights: ArticleCodeHighlights;
  lang: Lang;
  shareUrl?: string;
  /** 공개 지면은 이 글이 페이지의 본문이므로 `main` 으로 감싼다. 관리자 미리보기는 이미 다른 `main` 안이다. */
  landmark?: boolean;
  children?: ReactNode;
};

/**
 * 글 한 편의 지면 — 히어로와 본문.
 *
 * 공개 상세와 관리자 전체 미리보기가 같은 컴포넌트를 쓴다. 미리보기의 목적이 "발행하면 이렇게
 * 보인다"를 확인하는 것이라, 두 화면이 갈라지는 순간 미리보기는 확인 수단으로서 쓸모를 잃는다.
 * 공개 지면에만 있는 하단 영역(연관 프로젝트·다른 글)은 `children` 으로 받아 미리보기에서는 비운다.
 *
 * 본문은 한국어 원문 하나뿐이라 `ArticleBody` 가 컨테이너에 `lang="ko"` 를 고정한다. 영어 경로에서는
 * 그 앞에 안내 문구를 둔다 — 제목·요약은 영어인데 본문만 한국어인 이유를 읽는 사람이 알아야 한다.
 *
 * 언어는 컨텍스트가 아니라 props 로 받는다. 관리자 미리보기는 관리자 UI 언어와 무관하게 한국어
 * 지면을 그려야 하고, 공개 상세는 URL 세그먼트가 언어의 단일 출처이기 때문이다.
 *
 * @param {Props} props
 * @param {string} props.title 현재 언어 제목.
 * @param {string} props.summary 현재 언어 요약.
 * @param {ImageMeta | null} props.cover 대표 이미지. 없으면 히어로가 타이포그래피형이 된다.
 * @param {string} props.coverAlt 대표 이미지 대체 텍스트.
 * @param {Date | null} props.publishedAt 발행일. 초안 미리보기에서는 null 이다.
 * @param {number} props.readingMinutes 예상 읽기 시간(분).
 * @param {string[]} props.tagLabels 현재 언어로 해석한 태그 라벨.
 * @param {ArticleDocument} props.document 정규화된 본문.
 * @param {ArticleCodeHighlights} props.highlights 서버가 미리 만든 코드 색칠 결과.
 * @param {Lang} props.lang 지면 언어. `en` 이면 본문 앞에 한국어 원문 안내를 둔다.
 * @param {string | undefined} props.shareUrl 공유할 canonical 주소.
 * @param {boolean | undefined} props.landmark `true` 면 지면 전체를 `main` 으로 감싼다. 기본값은 `article` — 관리자 미리보기처럼 이미 다른 `main` 안에 놓이는 경우다.
 * @param {ReactNode | undefined} props.children 본문 아래에 붙일 공개 전용 영역.
 * @returns {JSX.Element}
 */
const ArticleDetailView = ({
  title,
  summary,
  cover,
  coverAlt,
  publishedAt,
  readingMinutes,
  tagLabels,
  document,
  highlights,
  lang,
  shareUrl,
  landmark = false,
  children,
}: Props) => {
  const dict = DICTIONARY[lang];
  const Root = landmark ? "main" : "article";

  return (
    <Root className={styles.main}>
      <ArticleHero
        lang={lang}
        title={title}
        summary={summary}
        cover={cover}
        coverAlt={coverAlt}
        publishedAt={publishedAt}
        readingMinutes={readingMinutes}
        tagLabels={tagLabels}
        shareUrl={shareUrl}
      />

      <div className={styles.column}>
        {lang === "en" ? (
          <p className={styles.notice} lang="en">
            {dict.articleKoreanOnlyNotice}
          </p>
        ) : null}

        {/* 목차는 이 래퍼가 읽기 기준선에 걸린 동안에만 나타난다. */}
        <div data-article-reading-zone>
          <ArticleBody document={document} lang={lang} highlights={highlights} />
        </div>
        {children}
      </div>

      <ArticleToc
        items={buildArticleToc(document)}
        zoneSelector="[data-article-reading-zone]"
        lang={lang}
      />
    </Root>
  );
};

export { ArticleDetailView };
