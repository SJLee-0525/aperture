import { createLiveArticleImageUploader } from "@/features/admin-dev-articles/_lib/live-article-uploader";
import {
  createMockArticleImageUploader,
  type ArticleImageUploader,
} from "@/features/admin-dev-articles/_lib/mock-article-uploader";

import { shouldUseMockContent } from "@/lib/content/content-source";

/**
 * 지금 쓸 이미지 업로더를 고른다. 폼은 이 함수만 알고 구현은 모른다.
 *
 * mock 은 업로드 없이 실 주소와 같은 모양의 fixture 를, live 는 `dev-blog/{articleId}/`
 * 3단 WebP 업로더를 준다. 두 구현 모두 반환하는 `ImageMeta` 의 `url`/`path` 가
 * 저장 문서와 본문 Markdown 이 참조하는 계약이다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정하는 데 쓴다.
 * @returns {ArticleImageUploader} 파일 한 장을 올려 ImageMeta 를 주는 함수.
 */
const createArticleImageUploader = (articleId: string): ArticleImageUploader =>
  shouldUseMockContent()
    ? createMockArticleImageUploader(articleId)
    : createLiveArticleImageUploader(articleId);

export { createArticleImageUploader };
