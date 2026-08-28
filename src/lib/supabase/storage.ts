import { getSupabaseClient } from "@/lib/supabase/client";

/** Storage 객체 하나의 정리 판단용 정보 — 경로·크기·업로드 시각. */
type StorageFileInfo = { path: string; size: number; createdAt: Date };

/** 전 콘텐츠가 공유하는 공개 버킷. 경로 프리픽스(photos/·music/·dev/·dev-blog/)가 구획을 나눈다. */
const BUCKET = "media";

/** `.list()` 페이지 크기이자 `.remove()` 요청당 경로 상한. */
const PAGE_SIZE = 1000;

type ListedEntry = {
  name: string;
  /** 폴더 항목은 id 가 null 이다 — 파일 수·크기 집계에서 제외해야 한다. */
  id: string | null;
  created_at?: string | null;
  metadata?: { size?: number } | null;
};

const bucket = () => getSupabaseClient().storage.from(BUCKET);

/**
 * Storage 경로를 공개 버킷 URL 로 바꾼다.
 * 동기 문자열 조립이라 객체의 존재나 접근 권한을 확인하지 않는다.
 *
 * @param path 문서에 저장하는 형태의 Storage 객체 경로(버킷명 제외).
 * @returns `next.config` 의 remotePatterns 가 허용하는 공개 URL.
 */
const publicImageUrl = (path: string): string => bucket().getPublicUrl(path).data.publicUrl;

/**
 * WebP 이미지를 UUID 파일명으로 업로드한다.
 * 새 경로를 사용해 CDN과 브라우저의 이전 이미지 캐시를 피한다.
 * 경로에 버킷명을 넣지 않는다 — 문서의 `path` 필드가 기존 데이터와 같은 형태여야 한다.
 *
 * @param folder 이미지를 저장할 Storage 폴더.
 * @param blob 업로드할 WebP 이미지 데이터.
 * @param [name] 확장자를 뺀 파일명. 한 이미지의 원본·프리뷰·썸네일에 같은 값을 넘기면
 *   문서 없이도 세 파일이 한 벌임을 경로만으로 알 수 있다. 생략하면 파일마다 새 UUID.
 * @returns 공개 URL과 Storage 객체 경로.
 */
const uploadWebp = async (
  folder: string,
  blob: Blob,
  name: string = crypto.randomUUID(),
): Promise<{ url: string; path: string }> => {
  const path = `${folder}/${name}.webp`;
  // Blob 의 type 이 비면 supabase-js 가 text/plain 으로 보내 버킷 mime 제한에 걸린다 — 명시한다.
  const { error } = await bucket().upload(path, blob, { contentType: "image/webp" });
  if (error) throw new Error("이미지 업로드에 실패했습니다. 네트워크·용량을 확인하세요.");
  // publicImageUrl 은 업로드 성공을 검증하지 않는다. 위 error 확인이 전제다.
  return { url: publicImageUrl(path), path };
};

/** `.remove()` 는 요청당 경로 수 제한이 있어 청크로 나눠 보낸다. 청크 실패는 그대로 전파한다. */
const removePaths = async (paths: string[]): Promise<void> => {
  for (let start = 0; start < paths.length; start += PAGE_SIZE) {
    const { error } = await bucket().remove(paths.slice(start, start + PAGE_SIZE));
    if (error) throw new Error(error.message);
  }
};

/** 폴더 안의 항목을 페이지네이션으로 전량 나열한다. 기본 limit(100)에 의존하면 조용히 잘린다. */
const listEntries = async (folder: string): Promise<ListedEntry[]> => {
  const entries: ListedEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await bucket().list(folder, { limit: PAGE_SIZE, offset });
    if (error) throw new Error(error.message);
    const page = (data ?? []) as ListedEntry[];
    entries.push(...page);
    if (page.length < PAGE_SIZE) return entries;
  }
};

/**
 * Storage 폴더 안의 객체와 하위 폴더를 재귀 삭제한다.
 * `.list()` 는 재귀하지 않으므로 폴더 항목(id null)을 직접 내려간다.
 *
 * @param folder 삭제할 Storage 폴더 경로.
 * @returns 모든 하위 객체가 삭제되면 완료된다.
 */
const deleteFolder = async (folder: string): Promise<void> => {
  const entries = await listEntries(folder);
  await Promise.all(
    entries
      .filter((entry) => entry.id === null)
      .map((entry) => deleteFolder(`${folder}/${entry.name}`)),
  );
  await removePaths(
    entries.filter((entry) => entry.id !== null).map((entry) => `${folder}/${entry.name}`),
  );
};

/**
 * 경로 하나를 삭제하고 실제로 지워졌는지 응답 목록으로 검증한다.
 * `.remove()` 는 RLS 가 행을 걸러도(세션 만료) 오류 없이 빈 목록을 돌려주므로,
 * 존재를 방금 확인한 파일을 지우는 orphan 정리는 빈 목록을 실패로 처리해야
 * "N개 삭제" 보고가 실제 삭제와 어긋나지 않는다. 경로를 하나만 보내므로 응답
 * 항목의 name 표기(전체 경로/파일명)와 무관하게 목록이 비어 있지 않으면 그 파일이다.
 */
const deleteImageStrict = async (path: string): Promise<void> => {
  const { data, error } = await bucket().remove([path]);
  if (error) throw new Error(error.message);
  if (!(data ?? []).length) {
    throw new Error("파일이 삭제되지 않았습니다. 로그인 상태를 확인하세요.");
  }
};

/**
 * 중복 경로를 제거한 뒤 Storage 이미지 여러 개를 삭제한다.
 * `.remove()` 는 존재하지 않는 경로를 오류로 처리하지 않으므로 이미 삭제된 객체도 성공이다 —
 * 문서 삭제가 이미 지워진 파생본을 다시 지우는 멱등 경로가 이 계약에 의존한다.
 *
 * @param paths 삭제할 Storage 객체 경로 모음.
 * @returns 존재하는 객체의 삭제가 끝나면 완료된다.
 */
const deleteImages = async (paths: Iterable<string>): Promise<void> => {
  const uniquePaths = [...new Set(paths)].filter(Boolean);
  if (uniquePaths.length === 0) return;
  await removePaths(uniquePaths);
};

/** 사진 원본을 `photos/{photoId}` 폴더에 업로드한다. */
const uploadPhotoImage = (photoId: string, blob: Blob) => uploadWebp(`photos/${photoId}`, blob);
/** 사진 미리보기를 전용 하위 폴더에 업로드한다. */
const uploadPhotoPreview = (photoId: string, blob: Blob) =>
  uploadWebp(`photos/${photoId}/previews`, blob);
/** 사진 썸네일을 전용 하위 폴더에 업로드한다. */
const uploadPhotoThumbnail = (photoId: string, blob: Blob) =>
  uploadWebp(`photos/${photoId}/thumbnails`, blob);
/** 사진 문서에 속한 모든 Storage 이미지를 삭제한다. */
const deletePhotoImages = (photoId: string) => deleteFolder(`photos/${photoId}`);

/** 음악 포스터 원본을 `music/{workId}` 폴더에 업로드한다. */
const uploadMusicPoster = (workId: string, blob: Blob) => uploadWebp(`music/${workId}`, blob);
/** 음악 포스터 미리보기를 전용 하위 폴더에 업로드한다. */
const uploadMusicPosterPreview = (workId: string, blob: Blob) =>
  uploadWebp(`music/${workId}/previews`, blob);
/** 음악 포스터 썸네일을 전용 하위 폴더에 업로드한다. */
const uploadMusicPosterThumbnail = (workId: string, blob: Blob) =>
  uploadWebp(`music/${workId}/thumbnails`, blob);
/** 연주 문서에 속한 모든 Storage 이미지를 삭제한다. */
const deleteMusicWorkImages = (workId: string) => deleteFolder(`music/${workId}`);

/** 개발 프로젝트 원본 이미지를 `dev/{projectId}` 폴더에 업로드한다. */
const uploadDevImage = (projectId: string, blob: Blob) => uploadWebp(`dev/${projectId}`, blob);
/** 프로젝트 미리보기를 전용 하위 폴더에 업로드한다. */
const uploadDevPreview = (projectId: string, blob: Blob) =>
  uploadWebp(`dev/${projectId}/previews`, blob);
/** 프로젝트 썸네일을 전용 하위 폴더에 업로드한다. */
const uploadDevThumbnail = (projectId: string, blob: Blob) =>
  uploadWebp(`dev/${projectId}/thumbnails`, blob);
/** 프로젝트 문서에 속한 모든 Storage 이미지를 삭제한다. */
const deleteDevProjectImages = (projectId: string) => deleteFolder(`dev/${projectId}`);

/**
 * 블로그 본문·대표 이미지 원본을 `dev-blog/{articleId}` 폴더에 업로드한다.
 * `assetId` 는 세 변형이 공유한다. 문서에서 참조가 끊긴 뒤에도 미사용 이미지 정리가
 * 파일명만으로 한 벌을 복원한다.
 */
const uploadArticleImage = (articleId: string, assetId: string, blob: Blob) =>
  uploadWebp(`dev-blog/${articleId}`, blob, assetId);
/** 블로그 이미지 미리보기를 전용 하위 폴더에 원본과 같은 `assetId` 로 업로드한다. */
const uploadArticlePreview = (articleId: string, assetId: string, blob: Blob) =>
  uploadWebp(`dev-blog/${articleId}/previews`, blob, assetId);
/** 블로그 이미지 썸네일을 전용 하위 폴더에 원본과 같은 `assetId` 로 업로드한다. */
const uploadArticleThumbnail = (articleId: string, assetId: string, blob: Blob) =>
  uploadWebp(`dev-blog/${articleId}/thumbnails`, blob, assetId);
/** 글 문서에 속한 모든 Storage 이미지를 삭제한다. */
const deleteArticleImages = (articleId: string) => deleteFolder(`dev-blog/${articleId}`);

/**
 * Storage 폴더 아래의 모든 객체를 재귀로 나열하고 크기·업로드 시각을 함께 읽는다.
 * 미사용 이미지 검사에서 참조 여부와 업로드 시각을 확인할 때 쓴다.
 *
 * `.list()` 응답에 크기·시각이 포함돼 객체별 메타데이터 요청이 없다. 크기는
 * `metadata.size`, 시각은 최상위 `created_at` 이며 경로는 폴더 프리픽스를 결합해
 * 문서에 저장된 `path` 값과 같은 형태로 만든다.
 *
 * @param folder 나열할 Storage 폴더 경로.
 * @returns 하위 전체 객체의 경로·크기·업로드 시각.
 */
const listFolderFiles = async (folder: string): Promise<StorageFileInfo[]> => {
  const entries = await listEntries(folder);
  const files = entries
    .filter((entry) => entry.id !== null)
    .map((entry) => ({
      path: `${folder}/${entry.name}`,
      size: Number(entry.metadata?.size) || 0,
      // created_at 이 없을 때 epoch 를 쓰면 24시간 보호창이 항상 참이 되어,
      // 방금 올려 아직 본문에 넣지 않은 이미지가 미사용 정리의 최우선 삭제 대상이 된다.
      createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
    }));
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.id === null)
      .map((entry) => listFolderFiles(`${folder}/${entry.name}`)),
  );
  return [...files, ...nested.flat()];
};

export {
  deleteArticleImages,
  deleteDevProjectImages,
  deleteImageStrict,
  deleteImages,
  deleteMusicWorkImages,
  deletePhotoImages,
  listFolderFiles,
  publicImageUrl,
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
