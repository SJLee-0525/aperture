import { describe, expect, it } from "vitest";

import { normalizeTroubleshooting } from "@/lib/firebase/normalize-troubleshooting";

const empty = { ko: "", en: "" };

describe("normalizeTroubleshooting", () => {
  it.each([undefined, null, "문제 → 해결", {}, 1])(
    "배열이 아닌 %j 값은 빈 목록으로 다룬다",
    (value) => {
      expect(normalizeTroubleshooting(value)).toEqual([]);
    },
  );

  it("신형 구조의 다국어 필드를 보존한다", () => {
    const entry = {
      title: { ko: "이미지 최적화", en: "Image optimisation" },
      problem: { ko: "로딩이 느림", en: "Slow loading" },
      solution: { ko: "WebP 변환", en: "Convert to WebP" },
      result: { ko: "응답 개선", en: "Faster response" },
    };

    expect(normalizeTroubleshooting([entry])).toEqual([entry]);
  });

  it("신형 구조에서 누락되거나 문자열이 아닌 언어 필드를 빈 문자열로 보정한다", () => {
    expect(
      normalizeTroubleshooting([
        {
          title: { ko: "제목", en: 42 },
          problem: null,
          solution: { ko: false, en: "Solution" },
        },
      ]),
    ).toEqual([
      {
        title: { ko: "제목", en: "" },
        problem: empty,
        solution: { ko: "", en: "Solution" },
      },
    ]);
  });

  it("레거시 다국어 문장을 첫 화살표에서 문제와 해결로 분리한다", () => {
    expect(
      normalizeTroubleshooting([
        {
          ko: "느린 로딩 → 이미지 → WebP 변환",
          en: "Slow loading → images → WebP conversion",
        },
      ]),
    ).toEqual([
      {
        title: empty,
        problem: { ko: "느린 로딩", en: "Slow loading" },
        solution: { ko: "이미지 → WebP 변환", en: "images → WebP conversion" },
      },
    ]);
  });

  it("화살표가 없는 레거시 문장은 전부 문제로 보존한다", () => {
    expect(normalizeTroubleshooting([{ ko: "문제 설명", en: "Problem description" }])).toEqual([
      {
        title: empty,
        problem: { ko: "문제 설명", en: "Problem description" },
        solution: empty,
      },
    ]);
  });

  it("null과 primitive 배열 항목도 안전한 빈 구조로 변환한다", () => {
    expect(normalizeTroubleshooting([null, "legacy"])).toEqual([
      { title: empty, problem: empty, solution: empty },
      { title: empty, problem: empty, solution: empty },
    ]);
  });
});
