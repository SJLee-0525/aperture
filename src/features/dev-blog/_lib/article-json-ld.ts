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
 * @param input 글과 이미 계산한 주소·라벨.
 * @returns `JSON.stringify` 해서 script 에 넣을 객체.
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

/**
 * HTML 안에 그대로 두면 태그 경계를 흔드는 문자. `JSON.stringify` 는 이들을 건드리지 않는다.
 * 값은 전부 JSON 문자열 안의 유니코드 이스케이프라 파서가 읽는 내용은 바뀌지 않는다.
 */
const HTML_UNSAFE_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * 구조화 데이터를 `<script type="application/ld+json">` 안에 넣을 문자열로 만든다.
 *
 * `JSON.stringify` 만으로는 안 된다. 이 함수가 받는 값에는 제목·요약·태그 라벨처럼
 * 관리자가 자유롭게 입력한 문자열이 들어가는데, `JSON.stringify` 는 `<` 를 그대로 두므로
 * 제목에 닫는 script 태그가 있으면 script 요소가 거기서 끝나고 뒤 내용이 문서 본문이 된다.
 * 현재 CSP 는 인라인 script 를 허용하므로 그렇게 새어 나온 조각이 실행된다.
 *
 * @param jsonLd `buildArticleJsonLd` 가 만든 객체.
 * @returns script 안에 그대로 넣어도 태그 경계를 깨지 않는 JSON 문자열.
 */
const serializeJsonLdScript = (jsonLd: Record<string, unknown>): string =>
  JSON.stringify(jsonLd).replace(
    /[<>&\u2028\u2029]/g,
    (character) => HTML_UNSAFE_ESCAPES[character] ?? character,
  );

export { buildArticleJsonLd, serializeJsonLdScript };
