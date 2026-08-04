import { describe, expect, it } from "vitest";

import { highlightTokensFor, splitTitleByMatches } from "@/lib/search/highlight-title";

describe("splitTitleByMatches", () => {
  it("질의 토큰이 포함된 구간을 hit 세그먼트로 분리한다", () => {
    expect(splitTitleByMatches("부산의 새벽", highlightTokensFor("부산"))).toEqual([
      { text: "부산", hit: true },
      { text: "의 새벽", hit: false },
    ]);
  });

  it("대소문자를 무시하고 라틴 토큰을 찾되 원문 표기를 보존한다", () => {
    expect(splitTitleByMatches("Dawn in Busan", highlightTokensFor("busan"))).toEqual([
      { text: "Dawn in ", hit: false },
      { text: "Busan", hit: true },
    ]);
  });

  it("일치가 없으면 원문 한 조각만 반환한다", () => {
    expect(splitTitleByMatches("겨울 바다", highlightTokensFor("부산"))).toEqual([
      { text: "겨울 바다", hit: false },
    ]);
  });

  it("겹치는 매치 구간은 하나의 세그먼트로 합친다", () => {
    expect(splitTitleByMatches("부산항 야경", highlightTokensFor("부산 부산항"))).toEqual([
      { text: "부산항", hit: true },
      { text: " 야경", hit: false },
    ]);
  });

  it("같은 토큰의 반복 등장을 모두 하이라이트한다", () => {
    expect(splitTitleByMatches("부산, 또 부산", highlightTokensFor("부산"))).toEqual([
      { text: "부산", hit: true },
      { text: ", 또 ", hit: false },
      { text: "부산", hit: true },
    ]);
  });

  it("초성 질의는 하이라이트하지 않는다 — 완성형 제목에 자모가 없다", () => {
    expect(splitTitleByMatches("부산의 새벽", highlightTokensFor("ㅂㅅ"))).toEqual([
      { text: "부산의 새벽", hit: false },
    ]);
  });
});

describe("highlightTokensFor", () => {
  it("별칭 사전이 치환한 원어도 하이라이트 토큰에 남긴다", () => {
    // 채점 토큰은 "피아노"→piano 로 치환되지만, 사용자가 친 원어가 제목에 그대로 있으면 표시.
    expect(splitTitleByMatches("피아노 소나타", highlightTokensFor("피아노"))).toEqual([
      { text: "피아노", hit: true },
      { text: " 소나타", hit: false },
    ]);
  });

  it("별칭의 영문 토큰으로도 하이라이트한다", () => {
    expect(splitTitleByMatches("Canon 필름 스캔", highlightTokensFor("캐논"))).toEqual([
      { text: "Canon", hit: true },
      { text: " 필름 스캔", hit: false },
    ]);
  });

  it("부분 일치(합성어)는 하이라이트하지 않는다", () => {
    expect(splitTitleByMatches("우수상 수상", highlightTokensFor("수상내역"))).toEqual([
      { text: "우수상 수상", hit: false },
    ]);
  });

  it("별칭 원어에 조사가 붙어도 어간을 하이라이트한다", () => {
    // 채점 토큰은 "캐논으로"→canon 치환이라 원어가 없다 — 원어 경로가 조사를 떼서 잡는다.
    expect(splitTitleByMatches("캐논 필름 스캔", highlightTokensFor("캐논으로"))).toEqual([
      { text: "캐논", hit: true },
      { text: " 필름 스캔", hit: false },
    ]);
  });

  it("전각 문자 제목도 NFKC 정규화로 대조하되 원문 표기를 보존한다", () => {
    expect(splitTitleByMatches("Ｃａｎｏｎ 스캔", highlightTokensFor("canon"))).toEqual([
      { text: "Ｃａｎｏｎ", hit: true },
      { text: " 스캔", hit: false },
    ]);
  });
});
