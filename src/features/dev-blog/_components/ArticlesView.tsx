"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { PageToolbar } from "@/components/PageToolbar";
import { TagFilterBar } from "@/components/TagFilterBar";
import { ViewToggle } from "@/components/ViewToggle";
import { ArticleCard } from "@/features/dev-blog/_components/ArticleCard";
import { ArticlePagination } from "@/features/dev-blog/_components/ArticlePagination";

import { useLang } from "@/features/lang/_hooks/use-lang";

import {
  articlePageCount,
  buildArticleListHref,
  parseArticleListQuery,
  sliceArticlesPage,
} from "@/features/dev-blog/_lib/article-list-query";

import { pickText } from "@/lib/i18n/pick-text";
import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

import type { ArticleListView } from "@/features/dev-blog/_lib/article-list-query";
import type { DevArticleSummary } from "@/features/dev-blog/_lib/article-projection";
import type { DevArticleTag } from "@/types/dev-article-tag";

import styles from "./ArticlesView.module.css";

/** 가장 좁은 화면의 첫 행 카드 수. list 보기와 767px 이하 grid 가 1열이다. */
const FIRST_ROW_CARDS = 1;

type Props = {
  articles: DevArticleSummary[];
  tags: DevArticleTag[];
};

/**
 * 블로그 목록 — 태그 필터, 보기 방식, 페이지를 모두 URL에 남긴다.
 *
 * 상태를 컴포넌트가 아니라 주소에 두는 이유는 공유한 링크와 뒤로가기가 같은 화면을 되살려야
 * 하기 때문이다. 주소 갱신은 `router` 대신 `pushCurrentUrl`·`replaceCurrentUrl` 을 쓴다.
 * Next 16 에서는 같은 pathname 으로의 `router.push` 가 no-op 이 되어 필터가 멈춘다.
 *
 * 마운트 뒤 한 번은 주소를 정규화한다. 범위를 벗어난 페이지, 지운 태그, 세 키 밖의 파라미터는
 * 화면에 반영되지 않는데 주소에는 남아 잘못된 링크가 공유되기 때문이다. 이 정규화는 replace 라
 * 뒤로가기 기록을 늘리지 않는다.
 *
 * @param {Props} props
 * @param {DevArticleSummary[]} props.articles 발행일 내림차순으로 정렬된 공개 글 요약 전체. 페이지 나누기는 이 화면이 한다.
 * @param {DevArticleTag[]} props.tags 통제 태그 사전. 칩 순서이자 `?tag=` 검증 기준이다.
 * @returns {JSX.Element}
 */
const ArticlesView = ({ articles, tags }: Props) => {
  const { dict, lang } = useLang();
  const searchParams = useSearchParams();

  const state = useMemo(() => parseArticleListQuery(searchParams, tags), [searchParams, tags]);
  // `TagFilterBar` 가 목록 변경을 감지해 넘침을 다시 재므로, 렌더마다 새 배열을 주지 않는다.
  const tagItems = useMemo(
    () => tags.map((tag) => ({ id: tag.id, label: pickText(tag, lang) })),
    [tags, lang],
  );
  const filtered = useMemo(
    () => (state.tag ? articles.filter((article) => article.tags.includes(state.tag!)) : articles),
    [articles, state.tag],
  );

  const pageCount = articlePageCount(filtered.length);
  const page = Math.min(state.page, pageCount);
  const canonical = useMemo(
    () => ({ tag: state.tag, view: state.view, page }),
    [state.tag, state.view, page],
  );

  useEffect(() => {
    const href = buildArticleListHref(window.location.pathname, canonical);
    if (href !== `${window.location.pathname}${window.location.search}`) replaceCurrentUrl(href);
  }, [canonical]);

  const go = (next: Partial<typeof canonical>) =>
    pushCurrentUrl(buildArticleListHref(window.location.pathname, { ...canonical, ...next }));

  const labelOf = (id: string) => {
    const tag = tags.find((candidate) => candidate.id === id);
    return tag ? pickText(tag, lang) : id;
  };

  const visible = sliceArticlesPage(filtered, page);

  return (
    <main className={styles.main}>
      <PageToolbar title={dict.devArticlesNav} count={`${filtered.length} articles`}>
        <ViewToggle
          options={[
            { id: "grid", label: dict.viewGrid, icon: "square" },
            { id: "list", label: dict.viewList, icon: "list" },
          ]}
          value={state.view}
          onChange={(view: ArticleListView) => go({ view, page: 1 })}
        />
      </PageToolbar>

      <TagFilterBar
        items={tagItems}
        activeId={state.tag}
        allLabel={dict.allTag}
        // 태그를 바꾸면 이전 페이지 번호는 의미가 없다.
        onSelect={(tag) => go({ tag, page: 1 })}
      />

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>{state.tag ? dict.articlesEmptyTag : dict.articlesEmptyAll}</p>
          {state.tag ? (
            <button
              type="button"
              className={styles.reset}
              onClick={() => go({ tag: null, page: 1 })}
            >
              {labelOf(state.tag)} · {dict.resetLabel}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className={styles.list} data-view={state.view}>
            {visible.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                view={state.view}
                lang={lang}
                priority={index < FIRST_ROW_CARDS}
                tagLabels={article.tags.map(labelOf)}
                readingLabel={dict.articleReadingMinutes.replace(
                  "{n}",
                  String(article.readingMinutes),
                )}
              />
            ))}
          </ul>

          <ArticlePagination
            page={page}
            pageCount={pageCount}
            dict={dict}
            onSelect={(next) => {
              go({ page: next });
              window.scrollTo({ top: 0 });
            }}
          />
        </>
      )}
    </main>
  );
};

export { ArticlesView };
