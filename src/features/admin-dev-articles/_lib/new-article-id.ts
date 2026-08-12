import { SESSION_STORAGE_KEYS } from "@/constants/storage-keys";

/**
 * 저장 전 새 글의 문서 ID를 탭에 붙들어 둔다.
 *
 * 새 글 화면은 진입할 때 ID를 미리 발급한다. 첫 저장 전에 올린 이미지도 그 ID의 Storage
 * 폴더에 들어가고(계획 §4), 편집 중 복구본도 그 ID로 저장되기 때문이다. 화면을 새로 그릴
 * 때마다 ID를 다시 만들면 새로고침 한 번에 복구본과 이미지가 주인을 잃는다.
 *
 * 탭 단위(sessionStorage)로 둔다 — 다른 탭에서 새 글을 열면 별개의 글이어야 한다.
 * 저장에 성공하면 지운다. 그 뒤로는 문서가 실제로 있으므로 편집 경로가 ID를 갖는다.
 */

/**
 * 이 탭이 쓰던 새 글 ID를 그대로 쓰거나, 없으면 새로 발급해 붙들어 둔다.
 *
 * @param {Storage} storage 세션 저장소.
 * @param {() => string} createId 새 ID를 만드는 함수(저장소가 발급).
 * @returns {string} 이 탭의 새 글 문서 ID. 저장소를 쓸 수 없으면 매번 새 ID를 준다.
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

/**
 * 붙들어 둔 새 글 ID를 놓아 준다. 저장에 성공한 직후에만 부른다.
 *
 * @param {Storage} storage 세션 저장소.
 * @returns {void}
 */
const clearNewArticleId = (storage: Storage): void => {
  try {
    storage.removeItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID);
  } catch {
    // 지우지 못해도 다음 새 글이 같은 자리를 덮어쓴다.
  }
};

export { clearNewArticleId, resolveNewArticleId };
