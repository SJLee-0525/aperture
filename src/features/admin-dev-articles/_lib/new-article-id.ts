import { SESSION_STORAGE_KEYS } from "@/constants/storage-keys";

// 새 글 화면은 진입할 때 문서 ID를 미리 발급한다. 첫 저장 전에 올린 이미지가 그 ID의
// Storage 폴더에 들어가고 편집 중 복구본도 그 ID로 저장되기 때문이다. 화면을 다시 그릴
// 때마다 ID를 새로 만들면 새로고침 한 번에 복구본과 이미지가 어느 글에도 속하지 않게 된다.
// 탭 단위(sessionStorage)로 둔다. 다른 탭에서 새 글을 열면 별개의 글이어야 한다.

/**
 * 이 탭이 쓰던 새 글 ID를 그대로 쓰거나, 없으면 새로 발급해 저장한다.
 *
 * @param createId 새 ID를 만드는 함수(저장소가 발급).
 * @returns 이 탭의 새 글 문서 ID. 저장소를 쓸 수 없으면 매번 새 ID를 준다.
 */
const resolveNewArticleId = (storage: Storage, createId: () => string): string => {
  try {
    const existing = storage.getItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID);
    if (existing) return existing;

    const id = createId();
    storage.setItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID, id);
    return id;
  } catch {
    // 저장소가 막힌 환경에서도 작성은 되게 한다. 새로고침 복구만 포기한다.
    return createId();
  }
};

/** 저장된 새 글 ID를 지운다. 저장에 성공한 직후에만 부른다. */
const clearNewArticleId = (storage: Storage): void => {
  try {
    storage.removeItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID);
  } catch {
    // 지우지 못해도 다음 새 글이 같은 자리를 덮어쓴다.
  }
};

export { clearNewArticleId, resolveNewArticleId };
