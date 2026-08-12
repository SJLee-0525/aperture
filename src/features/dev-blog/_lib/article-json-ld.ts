import { SITE_NAME } from "@/lib/seo/site-meta";

import type { DevArticle } from "@/types/dev-article";

type ArticleJsonLdInput = {
  article: DevArticle;
  /** 이 글의 canonical 절대 URL — 한국어 경로다. */
  canonicalUrl: string;
  /** 대표 이미지의 절대 URL. 없으면 넣지 않는다. */
  imageUrl: string | null;
  /** 현재 언어로 해석한 태그 라벨. */
  tagLabels: string[];
};

/**
 * 검색엔진이 읽는 글 구조화 데이터(BlogPosting).
 *
 * 본문은 한국어 원문 하나뿐이라 언어 경로와 무관하게 한국어 값과 한국어 canonical 주소를 신고한다.
 * 영어 경로에서 영어 제목으로 신고하면 같은 글이 두 문서로 잡히고, 그 둘은 서로의 번역본도 아니다.
 *
 * 본문 전체(`articleBody`)는 넣지 않는다. 지면에 이미 있는 내용을 한 번 더 실어 문서 크기만 키운다.
 *
 * @param {ArticleJsonLdInput} input 글과 이미 계산한 주소·라벨.
 * @returns {Record<string, unknown>} `JSON.stringify` 해서 script 에 넣을 객체.
 */
const buildArticleJsonLd = ({
  article,
  canonicalUrl,
  imageUrl,
  tagLabels,
}: ArticleJsonLdInput): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: article.title.ko,
  description: article.summary.ko,
  inLanguage: "ko",
  url: canonicalUrl,
  mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
  datePublished: article.publishedAt?.toISOString(),
  dateModified: article.updatedAt.toISOString(),
  author: { "@type": "Person", name: SITE_NAME },
  publisher: { "@type": "Person", name: SITE_NAME },
  ...(imageUrl ? { image: [imageUrl] } : {}),
  ...(tagLabels.length > 0 ? { keywords: tagLabels.join(", ") } : {}),
});

export { buildArticleJsonLd };
