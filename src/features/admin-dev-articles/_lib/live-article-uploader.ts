import {
  uploadArticleImage,
  uploadArticlePreview,
  uploadArticleThumbnail,
} from "@/lib/firebase/storage";

import type { ImageMeta } from "@/types/image";

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

import type { ArticleImageUploader } from "@/features/admin-dev-articles/_lib/mock-article-uploader";

/**
 * Storage 에 붙는 블로그 이미지 업로더 — `use-dev-image-upload` 와 같은 3단 webp
 * 파이프라인(2048 메인·960 프리뷰·320 썸네일)을 `dev-blog/{articleId}/` 경로에 태운다.
 *
 * 본문 Markdown 은 메인(2048) URL 하나만 담는다(B4.5 이월 결정). 프리뷰·썸네일은
 * 그 자산을 대표 이미지로 지정할 때만 문서에 참조가 남고, 본문 전용 이미지의 파생본은
 * 미참조로 남아 고아 정리 대상이 된다 — 지워져도 본문 렌더는 깨지지 않는 의도된 GC 다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정한다.
 * @returns {ArticleImageUploader} 파일 한 장을 압축·업로드해 ImageMeta 를 주는 함수.
 */
const createLiveArticleImageUploader =
  (articleId: string): ArticleImageUploader =>
  async (file: File): Promise<ImageMeta> => {
    const [compressed, preview, thumbnail] = await Promise.all([
      compressToWebp(file),
      compressPreviewToWebp(file),
      compressThumbnailToWebp(file),
    ]);
    const [size, previewSize, thumbnailSize, mainUpload, previewUpload, thumbnailUpload] =
      await Promise.all([
        readDimensions(compressed),
        readDimensions(preview),
        readDimensions(thumbnail),
        uploadArticleImage(articleId, compressed),
        uploadArticlePreview(articleId, preview),
        uploadArticleThumbnail(articleId, thumbnail),
      ]);
    return {
      ...mainUpload,
      ...size,
      preview: { ...previewUpload, ...previewSize },
      thumbnail: { ...thumbnailUpload, ...thumbnailSize },
    };
  };

export { createLiveArticleImageUploader };
