/**
 * 블로그 고정 글 상한. mock 저장소와 Supabase RPC 가 같은 값을 써야 두 모드의 동작이 같다.
 * `lib/` 은 `features/` 를 import 하지 않으므로 도메인 파일이 아니라 여기에 둔다.
 */

/**
 * 동시에 고정할 수 있는 글 수.
 * 고정 섹션은 목록의 모든 페이지 위에 반복되므로 늘어날수록 아래 목록이 첫 화면에서 밀려난다.
 */
const MAX_PINNED_ARTICLES = 3;

/** 상한을 넘겨 고정하려 할 때 관리자 목록에 뜨는 문구. */
const PIN_LIMIT_MESSAGE = `고정은 최대 ${MAX_PINNED_ARTICLES}개까지 할 수 있습니다.`;

export { MAX_PINNED_ARTICLES, PIN_LIMIT_MESSAGE };
