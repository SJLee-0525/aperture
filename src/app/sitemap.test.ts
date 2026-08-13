import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";

import sitemap from "@/app/sitemap";

/**
 * sitemap 은 라우트 목록을 수동으로 관리하므로(전 ROUTES 순회가 아님) 재배치 때 갱신을 빠뜨리기 쉽다.
 * 리다이렉트되는 URL이 남으면 크롤러가 색인 대상과 목적지를 두 번 읽는다.
 */
describe("sitemap", () => {
  it("리다이렉트되는 경로를 색인 목록에 넣지 않는다", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths).not.toContain("/ko/dev/about");
    expect(paths).not.toContain("/en/dev/about");
  });

  it("발행한 블로그 글을 한국어 URL 로만 등록한다", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    // 본문이 한국어 원문 하나뿐이라 상세 canonical 도 한국어다. 사이트맵이 그 신고를 따른다.
    expect(paths).toContain(`/ko${ROUTES.DEV_ARTICLES}/serverless-portfolio`);
    expect(paths).not.toContain(`/en${ROUTES.DEV_ARTICLES}/serverless-portfolio`);
    // 초안은 어디에도 나오지 않는다.
    expect(paths.some((path) => path.includes("rag-chunking-draft"))).toBe(false);
  });

  it("개발 섹션 공개 경로를 ko·en 두 벌로 등록한다", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    for (const route of [ROUTES.DEV, ROUTES.DEV_CAREER, ROUTES.DEV_PROJECTS, ROUTES.DEV_ARTICLES]) {
      expect(paths).toContain(`/ko${route}`);
      expect(paths).toContain(`/en${route}`);
    }
  });

  it("두 언어로 제공하는 지면은 ko·en·x-default alternates 를 갖는다", async () => {
    const entries = await sitemap();
    // 블로그 글은 한국어 단일 문서라 alternates 를 달지 않는다.
    const localized = entries.filter(
      (entry) => !new URL(entry.url).pathname.startsWith(`/ko${ROUTES.DEV_ARTICLES}/`),
    );

    expect(localized.length).toBeGreaterThan(0);
    for (const entry of localized) {
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages).sort()).toEqual(["en", "ko", "x-default"]);
    }
  });
});
