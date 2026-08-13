import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { ArticleDetailView } from "@/features/dev-blog/_components/ArticleDetailView";
import { ArticleNavigationTable } from "@/features/dev-blog/_components/ArticleNavigationTable";
import { ArticleRelatedProjects } from "@/features/dev-blog/_components/ArticleRelatedProjects";

import { toDevProjectCards } from "@/features/dev/_lib/dev-project-card";
import {
  buildArticleJsonLd,
  serializeJsonLdScript,
} from "@/features/dev-blog/_lib/article-json-ld";
import {
  toDevArticleSummaries,
  toDevArticleSummary,
} from "@/features/dev-blog/_lib/article-projection";
import { highlightArticleDocument } from "@/features/dev-blog/_lib/markdown-highlight";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";
import { articleReadingMinutes } from "@/features/dev-blog/_lib/markdown-reading-time";

import { devArticleRoute } from "@/constants/routes";
import { getDevProjects } from "@/lib/content/dev";
import { getDevArticleBySlug, getDevArticles, getDevArticleTags } from "@/lib/content/dev-articles";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/site-url";

import type { Lang } from "@/types/lang";
import type { Metadata } from "next";

import DevArticleLoading from "./loading";

/**
 * 공개 글 slug 를 미리 프리렌더 — lang 은 상위 [lang] layout 의 generateStaticParams 가 공급한다.
 *
 * @returns {Promise<{ slug: string }[]>}
 */
export async function generateStaticParams() {
  const articles = await getDevArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

/** 빌드 후 발행한 글은 요청-시 렌더 — 상위 [lang] 의 dynamicParams=false 가 이 세그먼트까지 잠그지 않게 명시한다. */
export const dynamicParams = true;

type Props = { params: Promise<{ lang: Lang; slug: string }> };

/**
 * 본문 파싱과 코드 색칠은 metadata 와 페이지가 각각 한 번씩 하면 두 번 돈다.
 * 같은 요청 안에서 결과를 나눠 쓴다.
 */
const getArticlePageData = cache(async (slug: string) => {
  const article = await getDevArticleBySlug(slug);
  if (!article) return null;

  const { document } = parseArticleMarkdown(article.body);
  const highlights = await highlightArticleDocument(document);
  return { article, document, highlights };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const data = await getArticlePageData(slug);

  if (!data) {
    return { title: "Article Not Found", robots: { index: false, follow: false } };
  }

  const { article } = data;
  const pathname = devArticleRoute(slug);
  const base = pageMetadata({ lang, title: article.title, description: article.summary, pathname });
  const coverUrl = article.cover ? absoluteUrl(article.cover.url) : null;
  const alt = article.coverAlt ? pickText(article.coverAlt, lang) : pickText(article.title, lang);

  return {
    ...base,
    // 본문은 한국어 원문 하나뿐이라 영어 경로는 번역본이 아니다. canonical 을 한국어 URL 로
    // 고정하고 hreflang 세트를 걸지 않는다 — 두 언어를 대등한 번역으로 신고하면 잘못된 신호다.
    alternates: { canonical: localizePath("ko", pathname) },
    openGraph: {
      ...base.openGraph,
      type: "article",
      url: localizePath("ko", pathname),
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      ...(coverUrl ? { images: [{ url: coverUrl, alt }] } : {}),
    },
    ...(coverUrl ? { twitter: { ...base.twitter, images: [coverUrl] } } : {}),
  };
}

/**
 * 개발 — 블로그 상세 (/dev/articles/[slug]).
 *
 * 초안은 공개 getter 가 돌려주지 않으므로 여기서 404 가 된다. 발행 상태를 화면에서 다시
 * 판단하지 않는 것이 초안이 새는 경로를 하나로 줄이는 방법이다.
 *
 * @param {Props} props
 * @returns {Promise<JSX.Element>}
 */
export default async function DevArticlePage({ params }: Props) {
  const { lang, slug } = await params;
  const [data, tags, projects, articles] = await Promise.all([
    getArticlePageData(slug),
    getDevArticleTags(),
    getDevProjects(),
    getDevArticles(),
  ]);
  if (!data) notFound();

  const { article, document, highlights } = data;
  const summary = toDevArticleSummary(article);
  const canonicalUrl = absoluteUrl(localizePath("ko", devArticleRoute(slug)));
  const tagLabels = article.tags.map((id) => tags.find((tag) => tag.id === id)?.[lang] ?? id);
  // 지정 순서를 지키되 공개 목록에 없는 프로젝트(비공개·삭제)는 빠진다.
  const projectById = new Map(toDevProjectCards(projects).map((card) => [card.id, card]));
  const relatedProjects = article.relatedProjectIds
    .map((id) => projectById.get(id))
    .filter((card) => card !== undefined);

  const jsonLd = buildArticleJsonLd({
    article,
    canonicalUrl,
    imageUrl: article.cover ? absoluteUrl(article.cover.url) : null,
    tagLabels: article.tags.map((id) => tags.find((tag) => tag.id === id)?.ko ?? id),
  });

  return (
    <Suspense fallback={<DevArticleLoading />}>
      <script
        type="application/ld+json"
        // 제목·요약·태그 라벨은 관리자가 자유롭게 쓴 값이라 태그 경계를 깨는 문자가 들어올 수 있다.
        // 직렬화는 그 문자를 이스케이프하는 `serializeJsonLdScript` 를 반드시 거친다.
        dangerouslySetInnerHTML={{ __html: serializeJsonLdScript(jsonLd) }}
      />
      <ArticleDetailView
        title={pickText(article.title, lang)}
        summary={pickText(article.summary, lang)}
        cover={article.cover}
        coverAlt={article.coverAlt ? pickText(article.coverAlt, lang) : ""}
        publishedAt={summary.publishedAt}
        readingMinutes={articleReadingMinutes(document)}
        tagLabels={tagLabels}
        document={document}
        highlights={highlights}
        lang={lang}
        shareUrl={absoluteUrl(localizePath("ko", devArticleRoute(slug)))}
        landmark
      >
        <ArticleRelatedProjects projects={relatedProjects} lang={lang} />
        <ArticleNavigationTable
          articles={toDevArticleSummaries(articles)}
          currentSlug={slug}
          lang={lang}
        />
      </ArticleDetailView>
    </Suspense>
  );
}
