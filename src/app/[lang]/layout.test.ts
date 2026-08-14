import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 로케일 셸의 `dynamicParams` 계약.
 *
 * 이 세그먼트가 `dynamicParams = false` 를 선언하면 하위 세그먼트까지 함께 잠겨, 프리렌더
 * 목록 밖의 글·앨범이 렌더되지 못하고 전역 404 가 된다. 자식 라우트의 `dynamicParams = true`
 * 로는 되돌릴 수 없고, 증상이 배포된 뒤에야 드러나므로 소스에서 고정한다.
 */
describe("[lang] 레이아웃", () => {
  it("dynamicParams 를 선언하지 않는다", () => {
    const source = readFileSync("src/app/[lang]/layout.tsx", "utf8");

    expect(source).not.toMatch(/^\s*export const dynamicParams/m);
  });

  it("지원 외 언어는 렌더 단계에서 404 로 막는다", () => {
    const source = readFileSync("src/app/[lang]/layout.tsx", "utf8");

    expect(source).toMatch(/if \(!isLang\(lang\)\) notFound\(\);/);
  });
});
