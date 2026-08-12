import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { ROUTES } from "@/constants/routes";

/**
 * sitemap 은 라우트 목록을 수동으로 관리하므로(전 ROUTES 순회가 아님) 재배치 때 갱신을 빠뜨리기 쉽다.
 * 리다이렉트되는 URL이 남으면 크롤러가 색인 대상과 목적지를 두 번 읽는다.
 */
describe("sitemap", () => {
  it("리다이렉트·미구현 경로를 색인 목록에 넣지 않는다", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths).not.toContain("/ko/dev/about");
    expect(paths).not.toContain("/en/dev/about");
    // 블로그 목록은 화면이 생기는 B4에서 추가한다.
    expect(paths.some((path) => path.includes(ROUTES.DEV_ARTICLES))).toBe(false);
  });

  it("개발 섹션 공개 경로를 ko·en 두 벌로 등록한다", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    for (const route of [ROUTES.DEV, ROUTES.DEV_CAREER, ROUTES.DEV_PROJECTS]) {
      expect(paths).toContain(`/ko${route}`);
      expect(paths).toContain(`/en${route}`);
    }
  });

  it("모든 항목이 ko·en·x-default alternates 를 갖는다", async () => {
    const entries = await sitemap();

    for (const entry of entries) {
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages).sort()).toEqual(["en", "ko", "x-default"]);
    }
  });
});
