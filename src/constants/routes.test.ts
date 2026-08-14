import { describe, expect, it } from "vitest";

import { matchDevArticleSlug } from "@/constants/routes";

describe("matchDevArticleSlug", () => {
  it("블로그 상세 경로에서 slug 를 읽는다", () => {
    expect(matchDevArticleSlug("/dev/articles/serverless-portfolio")).toBe("serverless-portfolio");
  });

  it.each([
    ["목록 경로", "/dev/articles"],
    ["세그먼트가 더 깊은 경로", "/dev/articles/a/b"],
    ["끝의 슬래시", "/dev/articles/my-post/"],
    ["대문자", "/dev/articles/MyPost"],
    ["밑줄", "/dev/articles/my_post"],
    ["percent-encoding", "/dev/articles/my%2Fpost"],
    ["다른 섹션", "/dev/projects/my-post"],
    ["빈 slug", "/dev/articles/"],
  ])("%s 는 slug 가 아니다", (_label, pathname) => {
    expect(matchDevArticleSlug(pathname)).toBeNull();
  });
});
