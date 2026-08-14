import { describe, expect, it } from "vitest";

import { articleTagTokens } from "@/features/dev-blog/_lib/article-tag-tokens";

import type { DevArticleTag } from "@/types/dev-article-tag";

const TAGS: DevArticleTag[] = [
  { id: "css", ko: "CSS", en: "CSS" },
  { id: "typescript", ko: "타입스크립트", en: "TypeScript" },
];

describe("articleTagTokens", () => {
  it("ko 와 en 이 같은 태그는 한 번만 담는다", () => {
    expect(articleTagTokens(["css"], TAGS)).toEqual(["CSS"]);
  });

  it("includeId 는 id 를 앞에 더한다", () => {
    expect(articleTagTokens(["typescript"], TAGS, { includeId: true })).toEqual([
      "typescript",
      "타입스크립트",
      "TypeScript",
    ]);
  });

  it("사전에 없는 태그는 id 를 남겨 검색에서 사라지지 않게 한다", () => {
    expect(articleTagTokens(["removed"], TAGS)).toEqual(["removed"]);
  });

  it("입력 순서를 지키고 같은 태그를 두 번 담지 않는다", () => {
    expect(articleTagTokens(["typescript", "css", "typescript"], TAGS)).toEqual([
      "타입스크립트",
      "TypeScript",
      "CSS",
    ]);
  });
});
