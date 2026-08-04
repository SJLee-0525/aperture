import { describe, expect, it } from "vitest";

import { createDocumentScorer } from "@/features/search/_lib/score-documents";
import { choseongOf } from "@/lib/text/choseong";
import { normalizeForSearch } from "@/lib/text/korean-tokenize";

const index = (title: string, body = "") => ({
  title: normalizeForSearch(title),
  body: normalizeForSearch(body),
  choseong: choseongOf(`${title} ${body}`),
});

describe("createDocumentScorer", () => {
  it("질의 토큰 절반 미만 일치는 0점 — 결과에서 제외된다", () => {
    const score = createDocumentScorer("니콘 제주 바다");
    expect(score(index("서울 야경"))).toBe(0);
  });

  it("임계값을 넘는 본문 일치는 양수 점수를 받는다", () => {
    const score = createDocumentScorer("부산");
    expect(score(index("항구 풍경", "부산 야경"))).toBeGreaterThan(0);
  });

  it("제목 일치가 본문 일치보다 높은 점수를 받는다", () => {
    const score = createDocumentScorer("부산");
    expect(score(index("부산의 새벽"))).toBeGreaterThan(score(index("항구 풍경", "부산 야경")));
  });

  it("불용어만 남는 질의는 항상 0점", () => {
    const score = createDocumentScorer("사진 보여줘");
    expect(score(index("부산의 새벽"))).toBe(0);
  });

  it("합성어 질의는 부분 일치로 임계값을 넘긴다", () => {
    const score = createDocumentScorer("수상내역");
    expect(score(index("우수상", "SSAFY 12기"))).toBeGreaterThan(0);
  });

  it("한글 브랜드 질의를 별칭으로 영문 장비명과 잇는다", () => {
    const score = createDocumentScorer("캐논");
    expect(score(index("겨울 바다", "Canon EOS R6"))).toBeGreaterThan(0);
    expect(score(index("겨울 바다", "Nikon Z6"))).toBe(0);
  });

  it("자모만 친 질의는 초성 인덱스와 대조한다", () => {
    const score = createDocumentScorer("ㅂㅅ");
    expect(score(index("부산의 새벽"))).toBeGreaterThan(0);
    expect(score(index("겨울 바다"))).toBe(0);
  });

  it("초성 질의는 어절 경계를 넘어도 잡힌다", () => {
    const score = createDocumentScorer("ㅇㅅㅂ");
    expect(score(index("부산의 새벽"))).toBeGreaterThan(0);
  });

  it("공백 섞인 초성 질의는 공백을 지우고 대조한다", () => {
    const score = createDocumentScorer("ㅂㅅㅇ ㅅㅂ");
    expect(score(index("부산의 새벽"))).toBeGreaterThan(0);
  });

  it("초성 일치 점수는 일반 매치보다 항상 낮다", () => {
    const choseongScore = createDocumentScorer("ㅂㅅ")(index("부산의 새벽"));
    const bodyScore = createDocumentScorer("부산")(index("항구 풍경", "부산 야경"));
    expect(choseongScore).toBeLessThan(bodyScore);
  });

  it("자모와 완성형이 섞인 질의는 일반 토큰 검색으로 처리한다", () => {
    const score = createDocumentScorer("부산 ㅅㅂ");
    expect(score(index("부산의 새벽"))).toBeGreaterThan(0);
  });

  it("초성 1자 질의는 판별력이 없어 초성 검색으로 보지 않는다", () => {
    const score = createDocumentScorer("ㅂ");
    expect(score(index("부산의 새벽"))).toBe(0);
  });
});
