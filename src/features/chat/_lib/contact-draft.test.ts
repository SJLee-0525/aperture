import { describe, expect, it } from "vitest";

import { CONTACT_DRAFT_LIMITS, parseContactDraft } from "@/features/chat/_lib/contact-draft";

describe("parseContactDraft", () => {
  it("완전한 초안과 이름·메일 없는 부분 초안을 수용한다", () => {
    expect(
      parseContactDraft({ name: " 이성준 ", email: " sj@example.com ", message: " 협업 문의 " }),
    ).toEqual({ name: "이성준", email: "sj@example.com", message: "협업 문의" });
    expect(parseContactDraft({ name: null, email: null, message: "문의드립니다." })).toEqual({
      name: null,
      email: null,
      message: "문의드립니다.",
    });
    // 빈 문자열은 null로 정규화한다.
    expect(parseContactDraft({ name: "", email: "  ", message: "문의" })).toEqual({
      name: null,
      email: null,
      message: "문의",
    });
  });

  it("null·record 아님·label 등 미지 키는 초안 없음으로 처리한다", () => {
    expect(parseContactDraft(null)).toBeNull();
    expect(parseContactDraft(undefined)).toBeNull();
    expect(parseContactDraft("draft")).toBeNull();
    // label은 계약에서 제외 — 있어도 무시하고 나머지로 판단한다.
    expect(
      parseContactDraft({ name: null, email: null, message: "문의", label: "보내기" }),
    ).toEqual({ name: null, email: null, message: "문의" });
  });

  it.each([
    ["빈 message", { name: null, email: null, message: "   " }],
    ["message 누락", { name: null, email: null }],
    ["message 길이 초과", { name: null, email: null, message: "가".repeat(2_001) }],
    ["잘못된 email", { name: null, email: "not-an-email", message: "문의" }],
    ["email 길이 초과", { name: null, email: `${"a".repeat(250)}@b.co`, message: "문의" }],
    ["이름 길이 초과", { name: "가".repeat(101), email: null, message: "문의" }],
    ["이름 타입 오류", { name: 42, email: null, message: "문의" }],
    ["email 타입 오류", { name: null, email: ["a@b.co"], message: "문의" }],
  ])("%s은 초안 전체를 버린다", (_, value) => {
    expect(parseContactDraft(value)).toBeNull();
  });

  it("상한은 연락 폼과 공유하는 단일 출처다", () => {
    expect(CONTACT_DRAFT_LIMITS).toEqual({ name: 100, email: 254, message: 2_000 });
  });
});
