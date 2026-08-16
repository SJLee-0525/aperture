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
 * 대표 이미지를 세 가지 크기의 WebP로 Storage에 올린다.
 * 파이프라인(2048 메인·960 프리뷰·320 썸네일)을 `dev-blog/{articleId}/` 경로에 태운다.
 *
 * 목록 카드와 상세 hero 가 프리뷰를, 통합검색 결과가 썸네일을 쓴다.
 * 세 파일은 같은 asset ID 를 파일명으로 공유해, 문서에서 참조가 끊긴 뒤에도 미사용 이미지
 * 정리가 한 벌임을 경로만으로 판단한다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정한다.
 * @returns {ArticleImageUploader} 파일 한 장을 압축·업로드해 ImageMeta 를 주는 함수.
 */
const createLiveArticleCoverUploader =
  (articleId: string): ArticleImageUploader =>
  async (file: File): Promise<ImageMeta> => {
    const assetId = crypto.randomUUID();
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
        uploadArticleImage(articleId, assetId, compressed),
        uploadArticlePreview(articleId, assetId, preview),
        uploadArticleThumbnail(articleId, assetId, thumbnail),
      ]);
    return {
      ...mainUpload,
      ...size,
      preview: { ...previewUpload, ...previewSize },
      thumbnail: { ...thumbnailUpload, ...thumbnailSize },
    };
  };

/**
 * 본문 이미지를 2048 WebP 한 장으로 Storage에 올린다.
 *
 * 본문 Markdown 은 원본 주소만 저장하고 렌더도 그 한 장만 쓴다. 파생본을 만들면 어디서도
 * 참조되지 않는 파일이 글마다 두 개씩 쌓인다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID. Storage 경로를 정한다.
 * @returns {ArticleImageUploader} 파일 한 장을 압축·업로드해 ImageMeta 를 주는 함수.
 */
const createLiveArticleBodyUploader =
  (articleId: string): ArticleImageUploader =>
  async (file: File): Promise<ImageMeta> => {
    const compressed = await compressToWebp(file);
    const [size, upload] = await Promise.all([
      readDimensions(compressed),
      uploadArticleImage(articleId, crypto.randomUUID(), compressed),
    ]);
    return { ...upload, ...size };
  };

export { createLiveArticleBodyUploader, createLiveArticleCoverUploader };
