import { Suspense } from "react";

import { ArticlesListSkeleton } from "@/features/dev-blog/_components/ArticlesListSkeleton";
import { ArticlesView } from "@/features/dev-blog/_components/ArticlesView";
import { BlogTools } from "@/features/dev-blog/_components/BlogTools";

import { toDevArticleSummaries } from "@/features/dev-blog/_lib/article-projection";
import { toArticleToolData } from "@/features/dev-blog/_lib/article-tool-data";

import { getDevArticles, getDevArticleTags } from "@/lib/content/dev-articles";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata({
    lang,
    title: { ko: "개발 블로그", en: "Dev Blog" },
    description: {
      ko: "개발자 이성준이 직접 만들며 막혔던 지점과 결정을 기록합니다.",
      en: "Notes on the problems and decisions behind what developer Sungjoon Lee builds.",
    },
    pathname: "/dev/articles",
  });
}

/**
 * 태그·보기·페이지 상태는 `useSearchParams` 를 읽는 클라이언트 뷰가 갖는다. 서버에서
 * `searchParams` 를 받으면 이 지면이 요청마다 렌더되어 공개 레이아웃의 ISR 이 무너지므로,
 * 서버는 전체 목록을 한 번 투영해 넘기고 필터는 브라우저에서 한다(콘텐츠가 소량이라 가능하다).
 * 읽기 시간 계산에 필요한 본문 파싱도 여기서 끝내고 카드에는 숫자만 내려보낸다.
 */
const ArticlesContent = async () => {
  const [articles, tags] = await Promise.all([getDevArticles(), getDevArticleTags()]);

  return (
    <>
      <ArticlesView articles={toDevArticleSummaries(articles)} tags={tags} />
      <BlogTools articles={toArticleToolData(articles, tags)} tags={tags} />
    </>
  );
};

/**
 * 개발 — 블로그 목록 (/dev/articles).
 *
 * 셸을 동기로 두고 fetch 를 자식으로 내린다. 상위 `articles/loading.tsx` 경계는 `[slug]`
 * 상세 전환에도 함께 쓰여 목록 모양을 그릴 수 없다.
 *
 * @returns {JSX.Element}
 */
export default function DevArticlesPage() {
  return (
    <Suspense fallback={<ArticlesListSkeleton />}>
      <ArticlesContent />
    </Suspense>
  );
}
