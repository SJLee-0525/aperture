import { describe, expect, it } from "vitest";

import {
  mailtoAddress,
  normalizePublicHref,
  preparePublicLinks,
  sanitizePublicLinks,
} from "@/lib/security/public-url";

describe("normalizePublicHref", () => {
  it.each(["https://example.com/path", "/ko/contact", "#details"])(
    "안전한 공개 링크 %s를 허용한다",
    (href) => expect(normalizePublicHref(href)).toBe(href),
  );

  it.each([
    "http://example.com",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://user:password@example.com",
    "https://example.com/\nheader",
  ])("위험하거나 모호한 링크 %s를 거부한다", (href) => {
    expect(normalizePublicHref(href)).toBe("");
  });

  it("사이트 링크에서만 단순 mailto 주소를 허용한다", () => {
    expect(normalizePublicHref("mailto:hello@example.com")).toBe("");
    expect(normalizePublicHref("mailto:hello@example.com", { allowMailto: true })).toBe(
      "mailto:hello@example.com",
    );
    expect(
      normalizePublicHref("mailto:hello@example.com?bcc=other@example.com", {
        allowMailto: true,
      }),
    ).toBe("");
    expect(
      normalizePublicHref("mailto:hello@example.com%0abcc=other@example.com", {
        allowMailto: true,
      }),
    ).toBe("");
  });
});

describe("public links", () => {
  it("공개 디코더에서는 잘못된 항목만 제거한다", () => {
    expect(
      sanitizePublicLinks(
        [
          { label: " GitHub ", href: "https://github.com/example" },
          { label: "위험", href: "javascript:alert(1)" },
          { label: "", href: "/contact" },
        ],
        { allowMailto: true },
      ),
    ).toEqual([{ label: "GitHub", href: "https://github.com/example" }]);
  });

  it("관리자 저장에서는 불완전하거나 위험한 항목을 거부한다", () => {
    expect(() => preparePublicLinks([{ label: "위험", href: "javascript:alert(1)" }])).toThrow(
      "1번째 링크",
    );
    expect(
      preparePublicLinks([{ label: " GitHub ", href: " https://github.com/example " }]),
    ).toEqual([{ label: "GitHub", href: "https://github.com/example" }]);
  });

  it("연락 폼에는 검증된 단일 수신 주소만 전달한다", () => {
    expect(mailtoAddress("mailto:hello@example.com")).toBe("hello@example.com");
    expect(mailtoAddress("mailto:hello@example.com?bcc=other@example.com")).toBe("");
  });
});
