import { describe, expect, it } from "vitest";

import { normalizeForSearch, tokensFor } from "@/lib/text/korean-tokenize";

describe("tokensFor", () => {
  it("조사를 떼고 불용어를 걸러 토큰 집합을 만든다", () => {
    expect(tokensFor("부산의 사진 보여줘")).toEqual(new Set(["부산"]));
  });

  it("별칭 사전으로 한글 브랜드를 영문 토큰과 잇는다", () => {
    expect(tokensFor("캐논")).toEqual(new Set(["canon"]));
  });

  it("한 글자 토큰은 버린다", () => {
    expect(tokensFor("상 봄")).toEqual(new Set());
  });
});

describe("normalizeForSearch", () => {
  it("문서 텍스트를 질의와 같은 파이프라인으로 정규화한 대조용 문자열을 만든다", () => {
    expect(normalizeForSearch("부산의 새벽 Dawn")).toBe("부산 새벽 dawn");
  });

  it("중복 토큰은 한 번만 남긴다", () => {
    expect(normalizeForSearch("야경 야경 야경")).toBe("야경");
  });
});
