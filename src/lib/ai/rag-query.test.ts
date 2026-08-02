import { describe, expect, it } from "vitest";

import { expandRagQuery, keywordSimilarity } from "@/lib/ai/rag-query";

describe("RAG 검색어 보강", () => {
  it("한글 카메라 브랜드를 영문 브랜드와 사진 문맥으로 확장한다", () => {
    expect(expandRagQuery("캐논으로 찍은 사진")).toContain("Canon camera");
  });

  it("한글 브랜드 검색어와 영문 장비명을 일치시킨다", () => {
    expect(
      keywordSimilarity("캐논", "Camera: Canon EOS R6 | Lens: RF 24-70mm"),
    ).toBeGreaterThanOrEqual(0.5);
    expect(keywordSimilarity("니콘", "Camera: Canon EOS R6")).toBeLessThan(0.5);
  });

  it("자연어 조사와 검색 요청 표현을 제거하고 장비명을 찾는다", () => {
    expect(keywordSimilarity("캐논으로 찍은 사진 보여줘", "Canon EOS R6")).toBe(1);
  });

  it.each([
    ["lake", "제목: 고요한 저녁 | 장소: 광교호수공원"],
    ["리액트", "React TypeScript 프로젝트"],
    ["piano", "피아노 독주회"],
  ])("도메인 이중언어 별칭을 연결한다: %s", (query, document) => {
    expect(keywordSimilarity(query, document)).toBe(1);
  });
});
