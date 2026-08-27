import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/Icon";
import { ImageFallback } from "@/components/ImageFallback";

import { devArticleRoute } from "@/constants/routes";
import { formatEventYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";

import { imagePreviewUrl } from "@/types/image";

import type { ArticleListView } from "@/features/dev-blog/_lib/article-list-query";
import type { DevArticleSummary } from "@/features/dev-blog/_lib/article-projection";
import type { Lang } from "@/types/lang";

import styles from "./ArticleCard.module.css";

/**
 * 커버 슬롯의 실제 폭. `ArticleCard.module.css` 의 `.cover` 규칙과 같은 값이라 한쪽만 고치면
 * 어긋난다. list 는 폭이 고정이라 100vw 를 주면 116px 자리에 뷰포트 크기 소스를 받는다.
 */
const GRID_COVER_SIZES = "(max-width: 720px) 100vw, 560px";
const LIST_COVER_SIZES = "(max-width: 560px) 116px, 200px";

type Props = {
  article: DevArticleSummary;
  view: ArticleListView;
  lang: Lang;
  tagLabels: string[];
  readingLabel: string;
  pinnedLabel?: string;
  priority?: boolean;
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
 * @param {string | undefined} props.pinnedLabel 고정 배지 문구. 값이 있을 때만 배지를 그린다.
 *   화면에는 아이콘만 보이고 이 문구는 링크 이름에만 남는다.
 * @param {boolean | undefined} props.priority LCP 보호. 첫 행의 실제 대표 이미지만 eager 로드한다.
 *   대표 이미지가 없는 카드의 워드마크 자리표시자는 LCP 후보가 아니라서 받지 않는다.
 * @returns {JSX.Element}
 */
const ArticleCard = ({
  article,
  view,
  lang,
  tagLabels,
  readingLabel,
  pinnedLabel,
  priority = false,
}: Props) => {
  const title = pickText(article.title, lang);
  const coverUrl = article.cover ? imagePreviewUrl(article.cover) : "";
  const coverSizes = view === "list" ? LIST_COVER_SIZES : GRID_COVER_SIZES;

  return (
    <li className={styles.item} data-view={view}>
      <Link
        href={localizePath(lang, devArticleRoute(article.slug))}
        prefetch={false}
        className={styles.card}
        data-pinned={pinnedLabel ? "" : undefined}
        data-cursor-large="frame"
      >
        <div className={styles.cover} data-protected-image>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={article.coverAlt ? pickText(article.coverAlt, lang) : ""}
              fill
              sizes={coverSizes}
              className={styles.coverImg}
              draggable={false}
              priority={priority}
            />
          ) : (
            <ImageFallback />
          )}
          {pinnedLabel ? (
            <span className={styles.pinned}>
              <Icon name="pin" size={15} />
              {/* 아이콘만 보이지만 링크 이름에는 남는다. 아이콘은 aria-hidden 이라 지우면
                  카드가 고정 글이라는 사실이 보조기술에 전달되지 않는다. */}
              <span className="sr-only">{pinnedLabel}</span>
            </span>
          ) : null}
        </div>

        <div className={styles.cardBody}>
          <div className={styles.meta}>
            <time dateTime={article.publishedAt.toISOString()}>
              {formatEventYMD(article.publishedAt)}
            </time>
            <span>{readingLabel}</span>
          </div>
          {/* 목록 지면의 h1 은 `PageToolbar`, h2 는 고정·전체 섹션 이름이 갖는다. */}
          <h3 className={styles.title}>{title}</h3>
          {tagLabels.length > 0 ? (
            <div className={styles.tags}>{tagLabels.map((label) => `#${label}`).join(" ")}</div>
          ) : null}
        </div>
      </Link>
    </li>
  );
};

export { ArticleCard };
