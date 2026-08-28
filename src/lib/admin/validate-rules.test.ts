import { describe, expect, it } from "vitest";

import {
  collectIssues,
  requireAny,
  requireDate,
  requireKoText,
  requireValue,
  requireYear,
} from "@/lib/admin/validate-rules";

describe("requireKoText", () => {
  it("한국어가 비면 항목 이름을 넣은 문구를 낸다", () => {
    expect(requireKoText("title.ko", { ko: "  ", en: "en" }, "제목")).toEqual({
      field: "title.ko",
      message: "제목(한국어)을 입력하세요.",
    });
  });

  it("영어만 비어 있으면 통과한다", () => {
    // 저장 조건이 ko 기준이라는 계약이다.
    expect(requireKoText("title.ko", { ko: "한", en: "" }, "제목")).toBeNull();
  });
});

describe("requireDate", () => {
  it("epoch 와 잘못된 날짜를 값 없음으로 본다", () => {
    expect(requireDate("performedAt", new Date(0), "공연 날짜")?.field).toBe("performedAt");
    expect(requireDate("performedAt", new Date("x"), "공연 날짜")).not.toBeNull();
    expect(requireDate("performedAt", new Date("2026-03-14"), "공연 날짜")).toBeNull();
  });
});

describe("requireYear", () => {
  it("양의 정수만 받는다", () => {
    expect(requireYear("year", "2025", "연도")).toBeNull();
    expect(requireYear("year", "", "연도")).not.toBeNull();
    expect(requireYear("year", "0", "연도")).not.toBeNull();
    expect(requireYear("year", "-1", "연도")).not.toBeNull();
    expect(requireYear("year", "2025.5", "연도")).not.toBeNull();
  });
});

describe("requireAny · requireValue", () => {
  it("빈 배열과 빈 문자열을 잡는다", () => {
    expect(requireAny("photoIds", [], "사진")).not.toBeNull();
    expect(requireAny("photoIds", ["p1"], "사진")).toBeNull();
    expect(requireValue("image", "", "이미지")).not.toBeNull();
    expect(requireValue("image", "https://x", "이미지")).toBeNull();
  });
});

describe("collectIssues", () => {
  it("통과한 규칙을 걸러 화면 순서를 지킨다", () => {
    const issues = collectIssues(null, { field: "image", message: "이미지" }, null, {
      field: "title.ko",
      message: "제목",
    });

    expect(issues.map(({ field }) => field)).toEqual(["image", "title.ko"]);
  });
});
