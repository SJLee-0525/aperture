import { describe, expect, it } from "vitest";

import { createKeywordScorer, expandRagQuery, keywordSimilarity } from "@/lib/ai/rag-query";

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

  it("조사가 붙은 질문 토큰을 어간으로 정규화해 일치시킨다", () => {
    expect(keywordSimilarity("아이답이 뭐야?", "아이답 (AIDAP) 금융 플랫폼")).toBe(1);
    expect(keywordSimilarity("앨범의 제목을 알려줘", "앨범 제목: 도쿄의 밤")).toBe(1);
  });

  it("합성어 질문은 접두 부분 일치로 문서 키워드를 찾는다", () => {
    expect(
      keywordSimilarity("오 수상내역은 어떻게 돼?", "2025 — 우수상(2위) SSAFY 12기"),
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("3자 이상 조각 일치는 만점, 2자 조각 일치는 절반만 준다", () => {
    expect(keywordSimilarity("호수공원길", "호수공원")).toBe(1);
    expect(keywordSimilarity("프로젝트", "프로필 사진")).toBe(0.5);
  });

  it("의문·요청 표현만 있는 질문은 키워드 점수를 만들지 않는다", () => {
    expect(keywordSimilarity("언제 어떻게 됐어?", "2025 — 우수상(2위)")).toBe(0);
  });

  it("짧은 토큰은 부분 일치를 허용하지 않아 오탐을 막는다", () => {
    expect(keywordSimilarity("니콘", "Camera: Canon EOS R6")).toBe(0);
  });
});

describe("createKeywordScorer", () => {
  it("분류기 키워드와 로컬 토큰화 채점 중 높은 점수를 쓴다", () => {
    const score = createKeywordScorer("그건 언제 받았어?", ["우수상", "award"]);
    expect(score("2025 우수상(2위) SSAFY 12기")).toBe(0.5);
  });

  it("키워드가 없으면 로컬 토큰화만으로 채점한다", () => {
    const score = createKeywordScorer("울릉도");
    expect(score("울릉도 사진 Ulleungdo")).toBe(1);
  });

  it("일반어 키워드는 로컬과 같은 불용어 규칙으로 걸러 점수 인플레이션을 막는다", () => {
    const score = createKeywordScorer("의미없는입력값", ["사진"]);
    expect(score("도쿄 사진")).toBe(0);
  });

  it("두 단어 키워드는 단어별로 나눠 대조하고 한 글자 키워드는 버린다", () => {
    const score = createKeywordScorer("질문", ["수상 내역"]);
    expect(score("우수상 수상 내역 목록")).toBe(1);
    expect(createKeywordScorer("질문", ["상"])("우수상")).toBe(0);
  });

  it("한글 브랜드 키워드는 별칭 사전으로 영문 장비명과 만난다", () => {
    const score = createKeywordScorer("의미없는입력값", ["캐논"]);
    expect(score("Camera: Canon EOS R6 | Lens: RF 24-70mm")).toBe(1);
  });
});
