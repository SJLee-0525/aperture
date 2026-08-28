import { ArticleCard } from "@/features/dev-blog/_components/ArticleCard";

import type { DevArticleSummary } from "@/features/dev-blog/_lib/article-projection";
import type { Lang } from "@/types/lang";

import styles from "./PinnedArticles.module.css";

/** 이 섹션의 첫 행 카드 수. 항상 1열이라 첫 글 하나다. */
const FIRST_ROW_CARDS = 1;

/** 지면에 이 섹션은 하나뿐이라 고정 id 로 제목과 영역을 잇는다. */
const HEADING_ID = "pinned-articles-heading";

type Props = {
  articles: DevArticleSummary[];
  lang: Lang;
  heading: string;
  badgeLabel: string;
  labelOf: (tagId: string) => string;
  readingLabelOf: (minutes: number) => string;
};

/**
 * 목록 위에 붙는 고정 글 섹션.
 *
 * 같은 글은 아래 목록에도 발행일 자리에 그대로 남는다. 화면에 섹션 제목은 두지 않고
 * 카드의 고정 배지가 이 자리의 이유를 설명한다. 제목은 보조기술용으로만 남는다.
 *
 * 보기 토글과 무관하게 항상 목록 행으로 그린다. 카드형은 16:9 대표 이미지가 세로를 크게
 * 차지하는데, 이 섹션은 모든 페이지에 반복되므로 아래 목록이 첫 화면에서 밀려난다.
 * 같은 이유로 고정 자체가 `MAX_PINNED_ARTICLES` 건으로 제한된다.
 *
 * @param props.articles 고정 글. 비어 있으면 호출부가 이 섹션을 그리지 않는다.
 * @param props.lang 링크 프리픽스와 제목 언어.
 * @param props.heading 영역 이름. 화면에는 보이지 않고 보조기술만 읽는다.
 * @param props.badgeLabel 카드에 붙일 고정 배지 문구.
 * @param props.labelOf 태그 id 를 현재 언어 라벨로 바꾼다.
 * @param props.readingLabelOf 읽기 시간 문구를 만든다.
 */
const PinnedArticles = ({
  articles,
  lang,
  heading,
  badgeLabel,
  labelOf,
  readingLabelOf,
}: Props) => (
  <section className={styles.section} aria-labelledby={HEADING_ID}>
    <h2 id={HEADING_ID} className="sr-only">
      {heading}
    </h2>
    <ul className={styles.list}>
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          view="list"
          lang={lang}
          // 이 섹션의 첫 카드는 화면 맨 위라 LCP 후보다. 아래 목록의 첫 카드도 따로 받는다.
          // grid 보기에서는 그쪽 커버가 더 크고, 이 섹션의 글에 대표 이미지가 없을 수도 있다.
          priority={index < FIRST_ROW_CARDS}
          pinnedLabel={badgeLabel}
          tagLabels={article.tags.map(labelOf)}
          readingLabel={readingLabelOf(article.readingMinutes)}
        />
      ))}
    </ul>
  </section>
);

export { PinnedArticles };
