import { Suspense } from "react";

import { SearchPageSkeleton } from "@/components/PublicPageSkeletons";
import { SearchResults } from "@/features/search/_components/SearchResults";

import { buildSearchGroups } from "@/features/search/_lib/build-search-groups";
import { fetchSearchDocuments } from "@/features/search/_lib/fetch-search-documents";
import { searchArticleBodies } from "@/features/search/_lib/search-article-bodies";

import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ lang: Lang }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...pageMetadata({
      lang,
      title: { ko: "검색", en: "Search" },
      description: {
        ko: "이성준의 사진, 음악, 개발 작업을 검색합니다.",
        en: "Search the photography, music, and development work of Sungjoon Lee.",
      },
      pathname: "/search",
    }),
    robots: {
      index: false,
      follow: true,
    },
  };
}

/**
 * 검색 인덱스와 블로그 본문 일치를 한 번에 모아 완성된 목록을 렌더한다.
 *
 * 두 조회는 병렬로 시작한다. `getDevArticles` 는 React `cache` 로 중복 조회가 막히지만
 * 본문 평문화는 캐시 대상이 아니라, 순차로 기다리면 그 시간이 나머지 조회에 더해진다.
 *
 * @returns {Promise<JSX.Element>}
 */
const SearchResultsContent = async ({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Props["params"];
  searchParamsPromise: Props["searchParams"];
}) => {
  const [{ lang }, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);
  // `?q=a&q=b` 는 배열로 들어온다. 검색창이 만드는 형태가 아니므로 첫 값만 쓴다.
  const rawQuery = searchParams.q;
  const q = (Array.isArray(rawQuery) ? (rawQuery[0] ?? "") : (rawQuery ?? "")).trim();

  const [documents, bodyMatches] = await Promise.all([
    fetchSearchDocuments(),
    searchArticleBodies(q),
  ]);

  const { groups, total } = buildSearchGroups({ documents, bodyMatches, query: q, lang });
  return <SearchResults q={q} lang={lang} groups={groups} total={total} />;
};

/**
 * 통합 검색 (/search) — 사진·음악·개발 전 섹션.
 *
 * 셸을 동기로 두고 `params`·`searchParams` 를 Suspense 하위에서 기다린다. 목록은 인덱스
 * 매치와 본문 매치가 모두 모인 뒤 한 번에 나온다. 그 전까지는 스켈레톤이다.
 *
 * @returns {JSX.Element}
 */
export default function SearchPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchResultsContent paramsPromise={params} searchParamsPromise={searchParams} />
    </Suspense>
  );
}
