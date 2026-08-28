import { deleteMockImages, uploadMockImage } from "@/lib/admin/mock/mock-image-store";
import { selectRepository } from "@/lib/admin/select-repository";
import {
  deleteImages,
  uploadDevImage,
  uploadDevPreview,
  uploadDevThumbnail,
  uploadMusicPoster,
  uploadMusicPosterPreview,
  uploadMusicPosterThumbnail,
  uploadPhotoImage,
  uploadPhotoPreview,
  uploadPhotoThumbnail,
} from "@/lib/supabase/storage";

/** 업로드 결과 — 행에 저장하는 공개 URL 과 Storage 객체 경로. */
type StoredImage = { url: string; path: string };

/**
 * 이미지 저장 경계 — 업로드 훅이 보는 유일한 저장 표면.
 *
 * mock 모드에서도 EXIF 추출·webp 3단 압축은 실제로 돌고, 이 경계는 마지막 저장 호출만
 * 가른다. 경로 규칙(`photos/{id}` · `music/{id}` · `dev/{id}` + previews/thumbnails)은
 * 저장 문서가 참조하는 계약이므로 mock 도 같은 모양을 만든다.
 */
type AdminImageStore = {
  uploadPhotoImage: (photoId: string, blob: Blob) => Promise<StoredImage>;
  uploadPhotoPreview: (photoId: string, blob: Blob) => Promise<StoredImage>;
  uploadPhotoThumbnail: (photoId: string, blob: Blob) => Promise<StoredImage>;
  uploadMusicPoster: (workId: string, blob: Blob) => Promise<StoredImage>;
  uploadMusicPosterPreview: (workId: string, blob: Blob) => Promise<StoredImage>;
  uploadMusicPosterThumbnail: (workId: string, blob: Blob) => Promise<StoredImage>;
  uploadDevImage: (projectId: string, blob: Blob) => Promise<StoredImage>;
  uploadDevPreview: (projectId: string, blob: Blob) => Promise<StoredImage>;
  uploadDevThumbnail: (projectId: string, blob: Blob) => Promise<StoredImage>;
  /** 편집 취소·교체로 문서가 더 이상 참조하지 않는 객체를 지운다(asset-lifecycle). */
  deleteImages: (paths: Iterable<string>) => Promise<void>;
};

/**
 * mock 구현 — objectURL 로 저장한다. 새로고침하면 URL 이 끊어지는 한계는
 * 관리자 배지가 안내한다.
 *
 * @returns 브라우저 메모리에 붙는 이미지 저장소.
 */
const createMockImageStore = (): AdminImageStore => ({
  uploadPhotoImage: async (photoId, blob) => uploadMockImage(`photos/${photoId}`, blob),
  uploadPhotoPreview: async (photoId, blob) => uploadMockImage(`photos/${photoId}/previews`, blob),
  uploadPhotoThumbnail: async (photoId, blob) =>
    uploadMockImage(`photos/${photoId}/thumbnails`, blob),
  uploadMusicPoster: async (workId, blob) => uploadMockImage(`music/${workId}`, blob),
  uploadMusicPosterPreview: async (workId, blob) =>
    uploadMockImage(`music/${workId}/previews`, blob),
  uploadMusicPosterThumbnail: async (workId, blob) =>
    uploadMockImage(`music/${workId}/thumbnails`, blob),
  uploadDevImage: async (projectId, blob) => uploadMockImage(`dev/${projectId}`, blob),
  uploadDevPreview: async (projectId, blob) => uploadMockImage(`dev/${projectId}/previews`, blob),
  uploadDevThumbnail: async (projectId, blob) =>
    uploadMockImage(`dev/${projectId}/thumbnails`, blob),
  deleteImages: async (paths) => deleteMockImages(paths),
});

/**
 * 현재 콘텐츠 소스에 맞는 이미지 저장소. live 는 `lib/supabase/storage` 함수 그대로다.
 *
 * @returns mock 이면 objectURL, live 면 Supabase Storage 구현.
 */
const getAdminImageStore = selectRepository<AdminImageStore>(createMockImageStore, () => ({
  uploadPhotoImage,
  uploadPhotoPreview,
  uploadPhotoThumbnail,
  uploadMusicPoster,
  uploadMusicPosterPreview,
  uploadMusicPosterThumbnail,
  uploadDevImage,
  uploadDevPreview,
  uploadDevThumbnail,
  deleteImages,
}));

export { getAdminImageStore };
