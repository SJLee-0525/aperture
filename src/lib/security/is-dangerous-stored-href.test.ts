import { describe, expect, it } from "vitest";

import { isDangerousStoredHref } from "@/lib/security/public-url";

describe("isDangerousStoredHref", () => {
  it("실행 가능한 스킴을 거부한다", () => {
    expect(isDangerousStoredHref("javascript:alert(1)")).toBe(true);
    expect(isDangerousStoredHref("JavaScript:alert(1)")).toBe(true);
    expect(isDangerousStoredHref("data:text/html,<script>")).toBe(true);
    expect(isDangerousStoredHref("vbscript:msgbox")).toBe(true);
  });

  it("표시 정책과 저장 안전을 구분한다 — http 는 저장할 수 있다", () => {
    // 공개 화면에는 못 실리지만(normalizePublicHref 가 거른다) 저장 자체는 안전하다.
    expect(isDangerousStoredHref("http://example.com/ticket")).toBe(false);
    expect(isDangerousStoredHref("https://example.com/ticket")).toBe(false);
    expect(isDangerousStoredHref("mailto:someone@example.com")).toBe(false);
  });

  it("빈 값과 상대 경로는 거부하지 않는다", () => {
    expect(isDangerousStoredHref("")).toBe(false);
    expect(isDangerousStoredHref("   ")).toBe(false);
    expect(isDangerousStoredHref("/photo/albums/a1")).toBe(false);
    expect(isDangerousStoredHref("#section")).toBe(false);
    expect(isDangerousStoredHref(undefined)).toBe(false);
  });

  it("스킴 안에 제어문자를 끼워 넣은 우회를 거부한다", () => {
    // 브라우저는 URL 에서 탭·개행을 걷어내므로 아래 값은 javascript: 로 해석된다.
    expect(isDangerousStoredHref("java\tscript:alert(1)")).toBe(true);
    expect(isDangerousStoredHref("java\nscript:alert(1)")).toBe(true);
  });
});
