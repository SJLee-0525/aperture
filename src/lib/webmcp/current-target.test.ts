// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { resolveCurrentArticleSlug, resolveTargetId } from "@/lib/webmcp/current-target";

const at = (url: string) => window.history.replaceState(null, "", url);

describe("resolveTargetId", () => {
  beforeEach(() => at("/ko/photo?photo=p01"));

  it("인자를 우선하고, 없으면 열린 모달의 query 를 읽는다", () => {
    expect(resolveTargetId("given", "photo")).toBe("given");
    expect(resolveTargetId(undefined, "photo")).toBe("p01");
    expect(resolveTargetId("  ", "work")).toBeNull();
  });
});

describe("resolveCurrentArticleSlug", () => {
  it("상세 지면에서 slug 를 읽는다", () => {
    at("/ko/dev/articles/my-post");
    expect(resolveCurrentArticleSlug()).toBe("my-post");
  });

  it("끝 슬래시 하나는 챗봇 경로 정규화와 같게 정리한다", () => {
    at("/en/dev/articles/my-post/");
    expect(resolveCurrentArticleSlug()).toBe("my-post");
  });

  it("query 와 hash 는 pathname 에 없으므로 영향을 주지 않는다", () => {
    at("/ko/dev/articles/my-post?from=list#intro");
    expect(resolveCurrentArticleSlug()).toBe("my-post");
  });

  it("로케일 프리픽스가 없어도 같은 경로로 본다", () => {
    // 공개 URL 은 항상 프리픽스가 붙지만, 프리픽스가 없어도 판정이 흔들리지 않아야 한다.
    at("/dev/articles/my-post");
    expect(resolveCurrentArticleSlug()).toBe("my-post");
  });

  it.each([
    ["목록 지면", "/ko/dev/articles"],
    ["세그먼트가 더 깊은 경로", "/ko/dev/articles/a/b"],
    ["대문자 slug", "/ko/dev/articles/MyPost"],
    ["밑줄 slug", "/ko/dev/articles/my_post"],
    ["percent-encoding", "/ko/dev/articles/my%2Fpost"],
    ["다른 섹션", "/ko/dev/projects"],
  ])("%s 에서는 null 이다", (_label, url) => {
    at(url);
    expect(resolveCurrentArticleSlug()).toBeNull();
  });
});
