import {
  createLiveArticleBodyUploader,
  createLiveArticleCoverUploader,
} from "@/features/admin-dev-articles/_lib/live-article-uploader";
import {
  createMockArticleImageUploader,
  type ArticleImageUploader,
} from "@/features/admin-dev-articles/_lib/mock-article-uploader";

import { shouldUseMockContent } from "@/lib/content/content-source";

/**
 * 대표 이미지 업로더. 원본·프리뷰·썸네일 세 장을 만든다.
 * 두 업로더는 호출 형태가 같아 `variant` 없이는 폼이 서로 바꿔 넘겨도 타입이 통과한다.
 */
type ArticleCoverUploader = ArticleImageUploader & { readonly variant: "cover" };

/** 본문 이미지 업로더. 원본 한 장만 만든다. */
type ArticleBodyUploader = ArticleImageUploader & { readonly variant: "body" };

/**
 * 대표 이미지 업로더를 고른다. 폼은 이 함수만 알고 구현은 모른다.
 *
 * mock 은 업로드 없이 실 주소와 같은 모양의 fixture 를, live 는 3단 WebP 업로더를 준다.
 * 두 구현 모두 반환하는 `ImageMeta` 의 `url`/`path` 가 저장 문서가 참조하는 계약이다.
 *
 * @param articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정하는 데 쓴다.
 * @returns 파일 한 장을 올려 ImageMeta 를 주는 함수.
 */
const createArticleCoverUploader = (articleId: string): ArticleCoverUploader =>
  Object.assign(
    shouldUseMockContent()
      ? createMockArticleImageUploader(articleId)
      : createLiveArticleCoverUploader(articleId),
    { variant: "cover" } as const,
  );

/**
 * 본문 이미지 업로더를 고른다.
 *
 * live 는 파생본 없이 원본 한 장만 올린다. mock 은 애초에 한 장만 만들어 같은 구현을 쓴다.
 *
 * @param articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정하는 데 쓴다.
 * @returns 파일 한 장을 올려 ImageMeta 를 주는 함수.
 */
const createArticleBodyUploader = (articleId: string): ArticleBodyUploader =>
  Object.assign(
    shouldUseMockContent()
      ? createMockArticleImageUploader(articleId)
      : createLiveArticleBodyUploader(articleId),
    { variant: "body" } as const,
  );

export { createArticleBodyUploader, createArticleCoverUploader };
export type { ArticleBodyUploader, ArticleCoverUploader };
