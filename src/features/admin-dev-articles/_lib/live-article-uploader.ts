import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";
import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

import {
  uploadArticleImage,
  uploadArticlePreview,
  uploadArticleThumbnail,
} from "@/lib/supabase/storage";

import type { ArticleImageUploader } from "@/features/admin-dev-articles/_lib/mock-article-uploader";
import type { ImageMeta } from "@/types/image";

/**
 * 블로그 이미지를 세 가지 크기의 WebP로 Storage에 올린다.
 * 파이프라인(2048 메인·960 프리뷰·320 썸네일)을 `dev-blog/{articleId}/` 경로에 태운다.
 *
 * 본문 Markdown은 메인 이미지 URL만 저장한다. 프리뷰와 썸네일은
 * 그 자산을 대표 이미지로 지정할 때만 문서에 참조가 남고, 본문 전용 이미지의 파생본은
 * 참조가 없으면 미사용 이미지 정리 대상이 된다. 삭제해도 본문에는 영향이 없다.
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
