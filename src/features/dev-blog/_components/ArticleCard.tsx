import Image from "next/image";
import Link from "next/link";

import { devArticleRoute } from "@/constants/routes";
import { formatYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { imagePreviewUrl } from "@/types/image";

import type { ArticleListView } from "@/features/dev-blog/_lib/article-list-query";
import type { DevArticleSummary } from "@/features/dev-blog/_lib/article-projection";
import type { Lang } from "@/types/lang";

import styles from "./ArticleCard.module.css";

const COVER_SIZES = "(max-width: 720px) 100vw, 560px";

type Props = {
  article: DevArticleSummary;
  view: ArticleListView;
  lang: Lang;
  tagLabels: string[];
  readingLabel: string;
};

/**
 * 블로그 목록의 글 한 건 — 개발 프로젝트 카드와 같은 골격을 쓴다.
 *
 * 같은 개발 섹션 안에서 카드가 두 가지 모양이면 목록을 옮겨 다닐 때마다 눈이 다시 적응해야 한다.
 * 대표 이미지가 없을 때 사이트 워드마크 이미지를 까는 것도 프로젝트 카드와 같은 처리다 —
 * 라이트·다크용 두 장을 겹쳐 두고 테마에 따라 보여 준다.
 *
 * 전체가 하나의 링크다. 태그는 눌러도 필터가 바뀌지 않는 텍스트로 둔다 — 링크 안에 버튼을
 * 겹치면 카드마다 키보드 이동 순서가 늘어나고 중첩 인터랙션이 된다. 필터는 위쪽 칩 행이 맡는다.
 *
 * @param {Props} props
 * @param {DevArticleSummary} props.article 본문을 뺀 글 요약.
 * @param {ArticleListView} props.view 현재 보기 방식. `grid` 는 카드, `list` 는 한 줄 행이다.
 * @param {Lang} props.lang 링크 로케일 프리픽스와 제목·요약 언어를 고른다.
 * @param {string[]} props.tagLabels 사전에서 현재 언어로 해석한 태그 라벨.
 * @param {string} props.readingLabel 완성된 읽기 시간 문구.
 * @returns {JSX.Element}
 */
const ArticleCard = ({ article, view, lang, tagLabels, readingLabel }: Props) => {
  const title = pickText(article.title, lang);
  const coverUrl = article.cover ? imagePreviewUrl(article.cover) : "";

  return (
    <li className={styles.item} data-view={view}>
      <Link
        href={localizePath(lang, devArticleRoute(article.slug))}
        prefetch={false}
        className={styles.card}
        data-cursor-large="frame"
      >
        <div className={styles.cover} data-protected-image>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={article.coverAlt ? pickText(article.coverAlt, lang) : ""}
              fill
              sizes={COVER_SIZES}
              className={styles.coverImg}
              draggable={false}
            />
          ) : (
            <>
              <Image
                src="/dev-project-image"
                alt=""
                fill
                sizes={COVER_SIZES}
                className={`${styles.coverImg} ${styles.fallbackLight}`}
                draggable={false}
                unoptimized
              />
              <Image
                src="/dev-project-image-dark"
                alt=""
                fill
                sizes={COVER_SIZES}
                className={`${styles.coverImg} ${styles.fallbackDark}`}
                draggable={false}
                unoptimized
              />
            </>
          )}
        </div>

        <div className={styles.cardBody}>
          <div className={styles.meta}>
            <time dateTime={article.publishedAt.toISOString()}>
              {formatYMD(article.publishedAt)}
            </time>
            <span>{readingLabel}</span>
          </div>
          <h2 className={styles.title}>{title}</h2>
          {tagLabels.length > 0 ? (
            <div className={styles.tags}>{tagLabels.map((label) => `#${label}`).join(" ")}</div>
          ) : null}
          <p className={styles.summary}>{pickText(article.summary, lang)}</p>
        </div>
      </Link>
    </li>
  );
};

export { ArticleCard };
