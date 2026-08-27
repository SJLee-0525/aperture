import {
  ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX,
  ADMIN_FORM_DRAFT_KEY_PREFIX,
  SESSION_STORAGE_KEYS,
  STORAGE_KEYS,
} from "@/constants/storage-keys";

/**
 * 로그아웃할 때 지울 브라우저 저장소 항목.
 *
 * 복구본에는 아직 저장하지 않은 값이 그대로 들어 있다. 글은 본문 Markdown 전체이고, 엔티티
 * 폼과 설정 편집기도 같은 방식으로 떠 둔다. 이 값들은 mock 분기 없이 실데이터 모드에서도
 * 저장되므로, 공용 브라우저에서 로그아웃한 뒤에도 미발행 내용이 그대로 남는다.
 *
 * `ap-admin-` 접두사를 통째로 쓸어내면 안 된다. `storage-keys.ts` 의 mock CMS 저장소 열 개가
 * 같은 접두사를 공유하며, 그쪽은 E2E 초기화를 위해 접두사를 맞춰 둔 것이지 로그아웃 정리
 * 대상이 아니다. 지우면 mock 모드에서 작업한 사진·앨범·연주·프로젝트·설정이 함께 사라진다.
 *
 * 방문자 설정(테마·언어·동의)은 관리자 세션과 무관하므로 건드리지 않는다.
 */
type StorageLike = Pick<Storage, "removeItem" | "key" | "length">;

const isDraftKey = (key: string): boolean =>
  key.startsWith(ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX) || key.startsWith(ADMIN_FORM_DRAFT_KEY_PREFIX);

/**
 * 편집 중 작업본을 지운다. 저장소 접근이 막힌 브라우저에서도 로그아웃 자체는 끝나야 하므로
 * 실패를 삼킨다.
 *
 * @param local 글 복구본과 재검증 실패 기록이 있는 저장소.
 * @param session 저장 전 새 글 ID 가 있는 저장소.
 */
const clearAdminWorkspace = (local: StorageLike, session: StorageLike): void => {
  try {
    const draftKeys: string[] = [];
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key && isDraftKey(key)) draftKeys.push(key);
    }
    for (const key of draftKeys) local.removeItem(key);
    local.removeItem(STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE);
  } catch {
    // 저장소를 읽거나 쓸 수 없는 브라우저에서는 남는 값도 없다.
  }

  try {
    session.removeItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID);
  } catch {
    // 위와 같다.
  }
};

export { clearAdminWorkspace };
export type { StorageLike };
