import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase/client";

/** Storage 객체 하나의 정리 판단용 정보 — 경로·크기·업로드 시각. */
type StorageFileInfo = { path: string; size: number; createdAt: Date };

/**
 * WebP 이미지를 UUID 파일명으로 업로드한다.
 * 새 경로를 사용해 CDN과 브라우저의 이전 이미지 캐시를 피한다.
 *
 * @param {string} folder 이미지를 저장할 Storage 폴더.
 * @param {Blob} blob 업로드할 WebP 이미지 데이터.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadWebp = async (folder: string, blob: Blob): Promise<{ url: string; path: string }> => {
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  try {
    const target = ref(getFirebaseStorage(), path);
    await uploadBytes(target, blob, { contentType: "image/webp" });
    const url = await getDownloadURL(target);
    return { url, path };
  } catch {
    throw new Error("이미지 업로드에 실패했습니다. 네트워크·용량을 확인하세요.");
  }
};

/**
 * Storage 폴더 안의 객체와 하위 폴더를 재귀 삭제한다.
 *
 * @param {string} folder 삭제할 Storage 폴더 경로.
 * @returns {Promise<void>} 모든 하위 객체가 삭제되면 완료된다.
 */
const deleteFolder = async (folder: string): Promise<void> => {
  const listing = await listAll(ref(getFirebaseStorage(), folder));
  await Promise.all([
    ...listing.items.map((item) => deleteObject(item)),
    ...listing.prefixes.map((prefix) => deleteFolder(prefix.fullPath)),
  ]);
};

/**
 * 중복 경로를 제거한 뒤 Storage 이미지 여러 개를 삭제한다.
 * 이미 삭제된 객체는 오류로 처리하지 않는다.
 *
 * @param {Iterable<string>} paths 삭제할 Storage 객체 경로 모음.
 * @returns {Promise<void>} 존재하는 객체의 삭제가 끝나면 완료된다.
 */
const deleteImages = async (paths: Iterable<string>): Promise<void> => {
  const uniquePaths = [...new Set(paths)].filter(Boolean);
  await Promise.all(
    uniquePaths.map(async (path) => {
      try {
        await deleteObject(ref(getFirebaseStorage(), path));
      } catch (caught) {
        if ((caught as { code?: string }).code !== "storage/object-not-found") throw caught;
      }
    }),
  );
};

/**
 * 사진 원본을 `photos/{photoId}` 폴더에 업로드한다.
 *
 * @param {string} photoId 사진 문서 ID.
 * @param {Blob} blob 업로드할 WebP 원본.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadPhotoImage = (photoId: string, blob: Blob) => uploadWebp(`photos/${photoId}`, blob);
/**
 * 사진 미리보기를 전용 하위 폴더에 업로드한다.
 *
 * @param {string} photoId 사진 문서 ID.
 * @param {Blob} blob 업로드할 WebP 미리보기.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadPhotoPreview = (photoId: string, blob: Blob) =>
  uploadWebp(`photos/${photoId}/previews`, blob);
/**
 * 사진 썸네일을 전용 하위 폴더에 업로드한다.
 *
 * @param {string} photoId 사진 문서 ID.
 * @param {Blob} blob 업로드할 WebP 썸네일.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadPhotoThumbnail = (photoId: string, blob: Blob) =>
  uploadWebp(`photos/${photoId}/thumbnails`, blob);
/**
 * 사진 문서에 속한 모든 Storage 이미지를 삭제한다.
 *
 * @param {string} photoId 사진 문서 ID.
 * @returns {Promise<void>} 사진 폴더 삭제가 끝나면 완료된다.
 */
const deletePhotoImages = (photoId: string) => deleteFolder(`photos/${photoId}`);

/**
 * 음악 포스터 원본을 `music/{workId}` 폴더에 업로드한다.
 *
 * @param {string} workId 연주 문서 ID.
 * @param {Blob} blob 업로드할 WebP 포스터.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadMusicPoster = (workId: string, blob: Blob) => uploadWebp(`music/${workId}`, blob);
/**
 * 음악 포스터 미리보기를 전용 하위 폴더에 업로드한다.
 *
 * @param {string} workId 연주 문서 ID.
 * @param {Blob} blob 업로드할 WebP 미리보기.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadMusicPosterPreview = (workId: string, blob: Blob) =>
  uploadWebp(`music/${workId}/previews`, blob);
/**
 * 음악 포스터 썸네일을 전용 하위 폴더에 업로드한다.
 *
 * @param {string} workId 연주 문서 ID.
 * @param {Blob} blob 업로드할 WebP 썸네일.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadMusicPosterThumbnail = (workId: string, blob: Blob) =>
  uploadWebp(`music/${workId}/thumbnails`, blob);
/**
 * 연주 문서에 속한 모든 Storage 이미지를 삭제한다.
 *
 * @param {string} workId 연주 문서 ID.
 * @returns {Promise<void>} 연주 이미지 폴더 삭제가 끝나면 완료된다.
 */
const deleteMusicWorkImages = (workId: string) => deleteFolder(`music/${workId}`);

/**
 * 개발 프로젝트 원본 이미지를 `dev/{projectId}` 폴더에 업로드한다.
 *
 * @param {string} projectId 프로젝트 문서 ID.
 * @param {Blob} blob 업로드할 WebP 이미지.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadDevImage = (projectId: string, blob: Blob) => uploadWebp(`dev/${projectId}`, blob);
/**
 * 프로젝트 미리보기를 전용 하위 폴더에 업로드한다.
 *
 * @param {string} projectId 프로젝트 문서 ID.
 * @param {Blob} blob 업로드할 WebP 미리보기.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadDevPreview = (projectId: string, blob: Blob) =>
  uploadWebp(`dev/${projectId}/previews`, blob);
/**
 * 프로젝트 썸네일을 전용 하위 폴더에 업로드한다.
 *
 * @param {string} projectId 프로젝트 문서 ID.
 * @param {Blob} blob 업로드할 WebP 썸네일.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadDevThumbnail = (projectId: string, blob: Blob) =>
  uploadWebp(`dev/${projectId}/thumbnails`, blob);
/**
 * 프로젝트 문서에 속한 모든 Storage 이미지를 삭제한다.
 *
 * @param {string} projectId 프로젝트 문서 ID.
 * @returns {Promise<void>} 프로젝트 이미지 폴더 삭제가 끝나면 완료된다.
 */
const deleteDevProjectImages = (projectId: string) => deleteFolder(`dev/${projectId}`);

/**
 * 블로그 본문·대표 이미지 원본을 `dev-blog/{articleId}` 폴더에 업로드한다.
 *
 * @param {string} articleId 글 문서 ID. 저장 전에 발급한 ID를 그대로 쓴다.
 * @param {Blob} blob 업로드할 WebP 원본.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadArticleImage = (articleId: string, blob: Blob) =>
  uploadWebp(`dev-blog/${articleId}`, blob);
/**
 * 블로그 이미지 미리보기를 전용 하위 폴더에 업로드한다.
 *
 * @param {string} articleId 글 문서 ID.
 * @param {Blob} blob 업로드할 WebP 미리보기.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadArticlePreview = (articleId: string, blob: Blob) =>
  uploadWebp(`dev-blog/${articleId}/previews`, blob);
/**
 * 블로그 이미지 썸네일을 전용 하위 폴더에 업로드한다.
 *
 * @param {string} articleId 글 문서 ID.
 * @param {Blob} blob 업로드할 WebP 썸네일.
 * @returns {Promise<{ url: string; path: string }>} 다운로드 URL과 Storage 객체 경로.
 */
const uploadArticleThumbnail = (articleId: string, blob: Blob) =>
  uploadWebp(`dev-blog/${articleId}/thumbnails`, blob);
/**
 * 글 문서에 속한 모든 Storage 이미지를 삭제한다.
 *
 * @param {string} articleId 글 문서 ID.
 * @returns {Promise<void>} 글 이미지 폴더 삭제가 끝나면 완료된다.
 */
const deleteArticleImages = (articleId: string) => deleteFolder(`dev-blog/${articleId}`);

/**
 * Storage 폴더 아래의 모든 객체를 재귀로 나열하고 크기·업로드 시각을 함께 읽는다.
 * 미사용 이미지 검사에서 참조 여부와 업로드 시각을 확인할 때 쓴다.
 *
 * `list` 권한은 Rules 에서 관리자 전용이라 방문자 세션에서는 실패한다.
 * 객체 수만큼 `getMetadata` 요청이 나가므로 대량 폴더에는 쓰지 않는다 — 블로그 이미지
 * 규모(글당 수 장)를 전제로 한 함수다.
 *
 * @param {string} folder 나열할 Storage 폴더 경로.
 * @returns {Promise<StorageFileInfo[]>} 하위 전체 객체의 경로·크기·업로드 시각.
 */
const listFolderFiles = async (folder: string): Promise<StorageFileInfo[]> => {
  const listing = await listAll(ref(getFirebaseStorage(), folder));
  const nested = await Promise.all(
    listing.prefixes.map((prefix) => listFolderFiles(prefix.fullPath)),
  );
  const files = await Promise.all(
    listing.items.map(async (item) => {
      const metadata = await getMetadata(item);
      return {
        path: item.fullPath,
        size: Number(metadata.size) || 0,
        createdAt: new Date(metadata.timeCreated),
      };
    }),
  );
  return [...files, ...nested.flat()];
};

export {
  deleteArticleImages,
  deleteDevProjectImages,
  deleteImages,
  deleteMusicWorkImages,
  deletePhotoImages,
  listFolderFiles,
  uploadArticleImage,
  uploadArticlePreview,
  uploadArticleThumbnail,
  uploadDevImage,
  uploadDevPreview,
  uploadDevThumbnail,
  uploadMusicPoster,
  uploadMusicPosterPreview,
  uploadMusicPosterThumbnail,
  uploadPhotoImage,
  uploadPhotoPreview,
  uploadPhotoThumbnail,
};
