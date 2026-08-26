import Link from "next/link";

import { devArticleRoute } from "@/constants/routes";
import { formatEventYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";

import type { DevArticleProjectLink } from "@/types/dev-article";
import type { Lang } from "@/types/lang";

import styles from "./DevProjectRelatedArticles.module.css";

type Props = {
  articles: DevArticleProjectLink[];
  lang: Lang;
};

/**
 * 이 프로젝트를 지목한 공개 글 목록. 하나도 없으면 영역 자체를 만들지 않는다.
 *
 * 글 상세는 모달이 아니라 독립 지면이므로 링크로 나간다. 모달은 이동과 함께 닫힌다.
 *
 * @param {Props} props
 * @param {DevArticleProjectLink[]} props.articles 발행일 내림차순의 공개 글.
 * @param {Lang} props.lang 링크 프리픽스와 제목 언어.
 * @returns {JSX.Element | null} 글이 없으면 null.
 */
const DevProjectRelatedArticles = ({ articles, lang }: Props) => {
  if (articles.length === 0) return null;

  return (
    <ul className={styles.list}>
      {articles.map((article) => (
        <li key={article.id}>
          <Link
            href={localizePath(lang, devArticleRoute(article.slug))}
            prefetch={false}
            className={styles.row}
          >
            <span className={styles.title}>{pickText(article.title, lang)}</span>
            {article.publishedAt ? (
              <time className={styles.date} dateTime={article.publishedAt.toISOString()}>
                {formatEventYMD(article.publishedAt)}
              </time>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export { DevProjectRelatedArticles };
