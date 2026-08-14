"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Icon } from "@/components/Icon";

import { DICTIONARY } from "@/constants/dictionary";
import { devArticleRoute } from "@/constants/routes";
import { formatYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

import type { DevArticleSummary } from "@/features/dev-blog/_lib/article-projection";
import type { Lang } from "@/types/lang";

import styles from "./ArticleNavigationTable.module.css";

/** 표 한 쪽에 놓는 글 수. 본문을 밀어내지 않을 만큼만 보여 준다. */
const ROWS_PER_PAGE = 5;
/** 목록 지면의 `?page=` 와 뜻이 다르므로 키를 나눈다. */
const PAGE_PARAM = "articlePage";

type Props = {
  articles: DevArticleSummary[];
  currentSlug: string;
  lang: Lang;
};

/**
 * 본문 아래의 다른 글 표 — 발행일 순서에서 지금 글의 앞뒤를 훑는다.
 *
 * 처음에는 현재 글이 들어 있는 쪽을 편다. 목록으로 돌아갔다 오지 않고도 이웃한 글로 옮겨갈 수
 * 있게 하려는 것이라, 첫 화면이 1페이지면 오래된 글을 읽는 사람에게는 쓸모가 없다.
 *
 * 쪽 이동은 `replaceCurrentUrl` 로 주소만 바꾼다(push 아님). 이 표를 몇 번 넘겼다고 뒤로가기가
 * 그만큼 쌓이면, 본문 목차가 남긴 fragment 기록과 섞여 뒤로가기가 어디로 갈지 예측할 수 없게 된다.
 *
 * @param {Props} props
 * @param {DevArticleSummary[]} props.articles 발행일 내림차순 전체 공개 글.
 * @param {string} props.currentSlug 지금 보고 있는 글 — 그 행은 링크 대신 현재 위치로 표시한다.
 * @param {Lang} props.lang 링크 프리픽스와 제목 언어.
 * @returns {JSX.Element | null} 글이 하나뿐이면 null.
 */
const ArticleNavigationTable = ({ articles, currentSlug, lang }: Props) => {
  const dict = DICTIONARY[lang];
  const searchParams = useSearchParams();

  const currentIndex = articles.findIndex((article) => article.slug === currentSlug);
  const pageCount = Math.max(1, Math.ceil(articles.length / ROWS_PER_PAGE));
  const homePage = Math.floor(Math.max(currentIndex, 0) / ROWS_PER_PAGE) + 1;

  const page = useMemo(() => {
    const raw = searchParams.get(PAGE_PARAM)?.trim() ?? "";
    if (!/^\d+$/.test(raw)) return homePage;
    return Math.min(Math.max(Number(raw), 1), pageCount);
  }, [searchParams, homePage, pageCount]);

  if (articles.length <= 1) return null;

  const rows = articles.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const goPage = (next: number) => {
    const params = new URLSearchParams(window.location.search);
    // 현재 글이 들어 있는 쪽은 기본값이라 주소에 남기지 않는다.
    if (next === homePage) params.delete(PAGE_PARAM);
    else params.set(PAGE_PARAM, String(next));
    const query = params.toString();
    replaceCurrentUrl(
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{dict.articleListNav}</h2>

      <table className={styles.table}>
        <tbody>
          {rows.map((article) => {
            const title = pickText(article.title, lang);
            const current = article.slug === currentSlug;
            return (
              <tr key={article.id} className={current ? styles.current : undefined}>
                {/* 셀마다 링크를 두면 클릭·hover·커서가 제목 글자 폭에서만 반응한다. 행을
                    통째로 감싸는 링크 하나를 두어 어디를 눌러도 글로 넘어가게 한다. */}
                <td colSpan={2}>
                  {current ? (
                    <div aria-current="page" className={styles.currentRow}>
                      <span className={styles.currentTitle}>{title}</span>
                      <time className={styles.date} dateTime={article.publishedAt.toISOString()}>
                        {formatYMD(article.publishedAt)}
                      </time>
                    </div>
                  ) : (
                    <Link
                      href={localizePath(lang, devArticleRoute(article.slug))}
                      prefetch={false}
                      className={styles.row}
                    >
                      <span className={styles.title}>{title}</span>
                      <time className={styles.date} dateTime={article.publishedAt.toISOString()}>
                        {formatYMD(article.publishedAt)}
                      </time>
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pageCount > 1 ? (
        <nav className={styles.pager} aria-label={dict.paginationLabel}>
          <button
            type="button"
            aria-label={dict.paginationPrev}
            disabled={page === 1}
            onClick={() => goPage(page - 1)}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <span className={styles.pageState}>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            aria-label={dict.paginationNext}
            disabled={page === pageCount}
            onClick={() => goPage(page + 1)}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </nav>
      ) : null}
    </section>
  );
};

export { ArticleNavigationTable };
