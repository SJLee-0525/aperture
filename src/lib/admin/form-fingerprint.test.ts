import { describe, expect, it } from "vitest";

import { formFingerprint } from "@/lib/admin/form-fingerprint";

describe("formFingerprint", () => {
  it("같은 값이면 같은 지문이다", () => {
    const value = { title: { ko: "제목", en: "" }, order: 0 };

    expect(formFingerprint(value)).toBe(formFingerprint({ ...value }));
  });

  it("한 글자만 달라도 지문이 갈린다", () => {
    expect(formFingerprint({ ko: "가" })).not.toBe(formFingerprint({ ko: "각" }));
  });

  it("Date 는 ISO 문자열로 비교된다", () => {
    const at = new Date("2026-01-02T03:04:05.000Z");

    expect(formFingerprint({ at })).toBe(formFingerprint({ at: new Date(at.getTime()) }));
  });
});
