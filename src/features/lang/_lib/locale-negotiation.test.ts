import { describe, expect, it } from "vitest";

import {
  MAX_ACCEPT_LANGUAGE_LENGTH,
  browserLanguage,
  decideLocale,
} from "@/features/lang/_lib/locale-negotiation";

describe("browserLanguage", () => {
  it.each([
    ["ko", "ko"],
    ["KO", "ko"],
    ["ko-KR", "ko"],
    ["ko-kore-kr", "ko"],
    ["en", "en"],
    ["en-US", "en"],
    ["en-GB", "en"],
    ["ja", "en"],
    ["ja-JP", "en"],
    ["fr-FR", "en"],
    ["zh-Hans-CN", "en"],
  ] as const)("%s의 최우선 브라우저 언어를 %s로 정규화한다", (header, expected) => {
    expect(browserLanguage(header)).toBe(expected);
  });

  it.each([
    ["ko-KR,ko;q=0.9,en;q=0.8", "ko"],
    ["en-US,en;q=0.9,ko;q=0.8", "en"],
    ["en;q=0.4,ko;q=0.9", "ko"],
    ["ko;q=0.4,en;q=0.9", "en"],
    ["ja;q=1,ko;q=0.9,en;q=0.8", "en"],
    ["ja;q=0.5,ko;q=0.5", "en"],
    ["ko;q=0.5,ja;q=0.5", "ko"],
    ["ko;q=1.0", "ko"],
    ["en;q=0.001,ko;q=0", "en"],
    ["ko;q=0,en;q=1", "en"],
  ] as const)("품질값과 원래 순서를 반영한다: %s", (header, expected) => {
    expect(browserLanguage(header)).toBe(expected);
  });

  it.each([
    [" ko-KR , en ; q=0.8 ", "ko"],
    ["en,en-US;q=0.9", "en"],
    ["ko;q=0.7,ko-KR;q=0.9", "ko"],
    ["*,ko;q=0.9", "ko"],
    [",ko,,en;q=0.5,", "ko"],
  ] as const)("공백·중복·빈 항목을 안전하게 처리한다: %s", (header, expected) => {
    expect(browserLanguage(header)).toBe(expected);
  });

  it.each([
    null,
    "",
    "   ",
    ";;;;",
    "q=0.9",
    "ko;q=0",
    "*",
    "*;q=0",
    "ko;q=abc",
    "ko;q=-1",
    "ko;q=1.1",
    "ko;q=0.1234",
    "\0ko",
  ])("유효한 구체 언어가 없으면 default다: %s", (header) => {
    expect(browserLanguage(header)).toBe("default");
  });

  it("잘못된 항목은 제외하고 남은 유효 항목을 사용한다", () => {
    expect(browserLanguage("ko;q=abc,en;q=0.8")).toBe("en");
  });

  it("512자까지 허용하고 초과 입력은 파싱하지 않는다", () => {
    expect(browserLanguage(`ko${" ".repeat(MAX_ACCEPT_LANGUAGE_LENGTH - 2)}`)).toBe("ko");
    expect(browserLanguage(`ko${" ".repeat(MAX_ACCEPT_LANGUAGE_LENGTH - 1)}`)).toBe("default");
  });

  it("많은 항목에서도 허용된 결과만 반환한다", () => {
    const result = browserLanguage(Array.from({ length: 100 }, () => "en").join(","));
    expect(["ko", "en", "default"]).toContain(result);
  });
});

describe("decideLocale", () => {
  it.each([
    [["ko"], "en", { lang: "ko", source: "cookie" }],
    [["en"], "ko", { lang: "en", source: "cookie" }],
    [[], "ko", { lang: "ko", source: "accept-language" }],
    [[], "en", { lang: "en", source: "accept-language" }],
    [[], null, { lang: "ko", source: "default" }],
    [["fr"], "ko", { lang: "ko", source: "accept-language" }],
    [["KO"], "en", { lang: "en", source: "accept-language" }],
    [["en-US"], "ko", { lang: "ko", source: "accept-language" }],
    [["%65%6e"], "ko", { lang: "ko", source: "accept-language" }],
    [["ko", "en"], "en", { lang: "en", source: "accept-language" }],
  ] as const)("쿠키 %j와 헤더 %s의 우선순위를 판정한다", (cookies, header, expected) => {
    expect(decideLocale(cookies, header)).toEqual(expected);
  });
});
