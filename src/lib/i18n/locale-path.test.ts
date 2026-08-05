import { describe, expect, it } from "vitest";

import {
  langFromPath,
  localizePath,
  stripLangPrefix,
  switchLangPath,
} from "@/lib/i18n/locale-path";

describe("langFromPath", () => {
  it("첫 세그먼트가 지원 언어면 반환한다", () => {
    expect(langFromPath("/ko/photo")).toBe("ko");
    expect(langFromPath("/en")).toBe("en");
  });

  it("지원 외 세그먼트·루트는 null", () => {
    expect(langFromPath("/photo")).toBeNull();
    expect(langFromPath("/fr/photo")).toBeNull();
    expect(langFromPath("/")).toBeNull();
  });
});

describe("localizePath", () => {
  it("무-로케일 경로에 프리픽스를 붙인다 (쿼리·해시 보존)", () => {
    expect(localizePath("ko", "/photo")).toBe("/ko/photo");
    expect(localizePath("en", "/search?q=서울")).toBe("/en/search?q=서울");
    expect(localizePath("ko", "/")).toBe("/ko");
  });

  it("이미 프리픽스된 경로는 그대로 둔다", () => {
    expect(localizePath("en", "/ko/photo")).toBe("/ko/photo");
  });

  it("관리자·API·외부 경로는 그대로 둔다", () => {
    expect(localizePath("ko", "/admin/photos")).toBe("/admin/photos");
    expect(localizePath("ko", "/api/chat")).toBe("/api/chat");
    expect(localizePath("ko", "https://example.com/photo")).toBe("https://example.com/photo");
    expect(localizePath("ko", "mailto:a@b.c")).toBe("mailto:a@b.c");
  });
});

describe("stripLangPrefix", () => {
  it("프리픽스를 벗긴다 (루트 폴백 포함)", () => {
    expect(stripLangPrefix("/ko/photo/albums")).toBe("/photo/albums");
    expect(stripLangPrefix("/en")).toBe("/");
  });

  it("프리픽스가 없으면 그대로", () => {
    expect(stripLangPrefix("/photo")).toBe("/photo");
    expect(stripLangPrefix("/")).toBe("/");
  });
});

describe("switchLangPath", () => {
  it("같은 페이지의 다른 언어 경로로 교체한다 (쿼리·해시 보존)", () => {
    expect(switchLangPath("en", "/ko/dev/projects?project=p1")).toBe("/en/dev/projects?project=p1");
    expect(switchLangPath("ko", "/en")).toBe("/ko");
  });

  it("무-로케일 경로에도 프리픽스를 붙인다", () => {
    expect(switchLangPath("en", "/photo")).toBe("/en/photo");
  });

  it("관리자 경로는 바꾸지 않는다", () => {
    expect(switchLangPath("en", "/admin/photos")).toBe("/admin/photos");
  });
});
