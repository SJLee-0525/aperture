import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/lib/firebase/client";

/**
 * webp blob 을 {folder}/{uuid}.webp 에 업로드하고 {url, path} 반환.
 * uuid 파일명 — 같은 경로 덮어쓰기는 CDN·브라우저 캐시가 스테일되므로 항상 새 파일.
 */
const uploadWebp = async (folder: string, blob: Blob): Promise<{ url: string; path: string }> => {
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  try {
    const target = ref(storage, path);
    await uploadBytes(target, blob, { contentType: "image/webp" });
    const url = await getDownloadURL(target);
    return { url, path };
  } catch {
    throw new Error("이미지 업로드에 실패했습니다. 네트워크·용량을 확인하세요.");
  }
};

/** 폴더 전체 삭제 — 문서 삭제 시 Storage 정리. */
const deleteFolder = async (folder: string): Promise<void> => {
  const listing = await listAll(ref(storage, folder));
  await Promise.all(listing.items.map((item) => deleteObject(item)));
};

/** 사진: photos/{photoId}/{uuid}.webp (EXIF 는 업로드 前 use-image-upload 에서 추출). */
const uploadPhotoImage = (photoId: string, blob: Blob) => uploadWebp(`photos/${photoId}`, blob);
const deletePhotoImages = (photoId: string) => deleteFolder(`photos/${photoId}`);

/** 음악 포스터: music/{workId}/{uuid}.webp (EXIF 추출 없음 — 포스터는 좌표·촬영정보 불필요). */
const uploadMusicPoster = (workId: string, blob: Blob) => uploadWebp(`music/${workId}`, blob);
const deleteMusicImages = (workId: string) => deleteFolder(`music/${workId}`);

/** 개발 프로젝트 이미지(대표·갤러리): dev/{projectId}/{uuid}.webp (EXIF 추출 없음). */
const uploadDevImage = (projectId: string, blob: Blob) => uploadWebp(`dev/${projectId}`, blob);
const deleteDevImages = (projectId: string) => deleteFolder(`dev/${projectId}`);

/** 개별 path 삭제 — 이미지 교체 시 구 파일 정리(없으면 무시). */
const deleteImageAt = async (path: string): Promise<void> => {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // 이미 없거나 권한 밖 — 교체 흐름에서는 조용히 무시.
  }
};

export {
  deleteDevImages,
  deleteImageAt,
  deleteMusicImages,
  deletePhotoImages,
  uploadDevImage,
  uploadMusicPoster,
  uploadPhotoImage,
};
