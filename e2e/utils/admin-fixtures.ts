import type { Page } from "@playwright/test";

/**
 * 관리자 E2E 가 공유하는 브라우저 저장소 준비.
 *
 * mock 단계의 관리자 저장소는 localStorage 다. 테스트가 서로의 글을 보게 두면 목록 검증이
 * 실행 순서에 좌우되므로, 각 테스트는 시작 전에 관련 키를 지워 같은 자리에서 출발한다.
 * 저장소를 비우면 첫 조회에서 mock 글로 다시 채워진다.
 *
 * 이후 다른 관리자 기능의 E2E 도 같은 방식으로 자기 키를 지우면 된다.
 */

/**
 * 지울 키의 접두사. mock 관리자 컬렉션·설정·복구본 키는 전부 `ap-admin-` 으로 시작한다
 * (`constants/storage-keys.ts`) — 컬렉션이 늘어도 이 목록을 고칠 필요가 없다.
 */
const ADMIN_STORAGE_PREFIXES = ["ap-admin-"];

/** 세션에 붙들린 "저장 전 새 글 ID". 남아 있으면 이전 테스트의 초안을 이어받는다. */
const NEW_ARTICLE_ID_KEY = "ap-admin-dev-article-new:v1";

/** 초기화를 이미 했는지 표시하는 자리. 새로고침을 넘어 남아야 해서 sessionStorage 를 쓴다. */
const RESET_FLAG_KEY = "e2e-admin-storage-reset";

/**
 * 관리자 로컬 저장소를 비운 상태로 테스트를 시작한다.
 *
 * `addInitScript` 로 넣어 문서 스크립트보다 먼저 돌게 한다 — 페이지가 뜬 뒤 지우면 이미 읽은
 * 값으로 렌더가 한 번 지나간다. 다만 이 스크립트는 **새로고침에도 다시 돌기** 때문에 한 번만
 * 지우도록 표시를 남긴다. 그러지 않으면 자동 복구본처럼 테스트가 만든 값이 새로고침과 함께 사라진다.
 *
 * @param {Page} page 준비할 페이지.
 * @returns {Promise<void>}
 */
const resetAdminStorage = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ([prefixes, newArticleKey, flagKey]: [string[], string, string]) => {
      if (window.sessionStorage.getItem(flagKey)) return;
      window.sessionStorage.setItem(flagKey, "1");
      window.sessionStorage.removeItem(newArticleKey);

      for (const key of Object.keys(window.localStorage)) {
        if (prefixes.some((prefix) => key.startsWith(prefix))) window.localStorage.removeItem(key);
      }
    },
    [ADMIN_STORAGE_PREFIXES, NEW_ARTICLE_ID_KEY, RESET_FLAG_KEY] as [string[], string, string],
  );
};

export { resetAdminStorage };
