import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/lib/firebase/client";

const photoFolder = (photoId: string) => `photos/${photoId}`;

/**
 * webp blob 을 photos/{photoId}/{uuid}.webp 에 업로드하고 {url, path} 반환.
 * uuid 파일명 — 같은 경로 덮어쓰기는 CDN·브라우저 캐시가 스테일되므로 항상 새 파일.
 */
const uploadPhotoImage = async (
  photoId: string,
  blob: Blob,
): Promise<{ url: string; path: string }> => {
  const path = `${photoFolder(photoId)}/${crypto.randomUUID()}.webp`;
  try {
    const target = ref(storage, path);
    await uploadBytes(target, blob, { contentType: "image/webp" });
    const url = await getDownloadURL(target);
    return { url, path };
  } catch {
    throw new Error("이미지 업로드에 실패했습니다. 네트워크·용량을 확인하세요.");
  }
};

/** 사진 폴더(photos/{photoId}) 전체 삭제 — 사진 문서 삭제 시 Storage 정리. */
const deletePhotoImages = async (photoId: string): Promise<void> => {
  const listing = await listAll(ref(storage, photoFolder(photoId)));
  await Promise.all(listing.items.map((item) => deleteObject(item)));
};

/** 개별 path 삭제 — 이미지 교체 시 구 파일 정리(없으면 무시). */
const deleteImageAt = async (path: string): Promise<void> => {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // 이미 없거나 권한 밖 — 교체 흐름에서는 조용히 무시.
  }
};

export { deleteImageAt, deletePhotoImages, uploadPhotoImage };
