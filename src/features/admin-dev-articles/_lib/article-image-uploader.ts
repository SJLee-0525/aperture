import {
  createMockArticleImageUploader,
  type ArticleImageUploader,
} from "@/features/admin-dev-articles/_lib/mock-article-uploader";

import { shouldUseMockContent } from "@/lib/content/content-source";

const UNAVAILABLE_MESSAGE =
  "블로그 이미지 업로드가 아직 Storage 에 연결되지 않았습니다. mock 콘텐츠로 실행한 개발 서버에서 작성하세요.";

/**
 * 지금 쓸 이미지 업로더를 고른다. 폼은 이 함수만 알고 구현은 모른다.
 *
 * ⚠️ B5 에서 실데이터 분기를 `dev-blog/{articleId}/` 3단 WebP 업로더로 교체한다.
 * 그때까지는 실패를 드러낸다 — 올라간 줄 알았는데 본문 주소가 죽어 있는 편이 더 나쁘다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정하는 데 쓴다.
 * @returns {ArticleImageUploader} 파일 한 장을 올려 ImageMeta 를 주는 함수.
 */
const createArticleImageUploader = (articleId: string): ArticleImageUploader =>
  shouldUseMockContent()
    ? createMockArticleImageUploader(articleId)
    : () => Promise.reject(new Error(UNAVAILABLE_MESSAGE));

export { createArticleImageUploader };
