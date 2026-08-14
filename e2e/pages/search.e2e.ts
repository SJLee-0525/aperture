import { test } from "@playwright/test";

import { searchAssertions } from "../utils/assertions/search.assertions";

test("viewport에 맞는 검색 UI로 mock 콘텐츠를 찾는다", async ({ page }, testInfo) => {
  // dev 서버는 이 라우트 핸들러를 첫 요청에서 컴파일하고(~9초) 그동안 다른 응답까지 막는다.
  // 검색창 포커스가 부르는 fetch 라서 그냥 두면 제출 뒤 URL 단언이 그 컴파일을 기다린다.
  // 프로덕션 실행(next start)에는 없는 비용이므로 미리 한 번 쳐서 단언 밖으로 뺀다.
  await page.request.get("/api/search-index");

  await page.goto("/ko");
  await searchAssertions.submit(page, testInfo.project.name === "mobile");
});
