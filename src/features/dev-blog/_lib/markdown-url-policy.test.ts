import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, STORAGE_IMAGE_HOSTS } from "@/constants/security-headers";
import {
  resolveArticleImageSource,
  resolveArticleLink,
} from "@/features/dev-blog/_lib/markdown-url-policy";

describe("resolveArticleLink", () => {
  it("내부 경로와 fragment 는 같은 탭으로 연다", () => {
    expect(resolveArticleLink("/dev/projects")).toEqual({
      href: "/dev/projects",
      target: "internal",
    });
    expect(resolveArticleLink("#정리")).toEqual({ href: "#정리", target: "internal" });
  });

  it("HTTPS 외부 주소와 메일 주소를 구분한다", () => {
    expect(resolveArticleLink("https://nextjs.org/docs")).toEqual({
      href: "https://nextjs.org/docs",
      target: "external",
    });
    expect(resolveArticleLink("mailto:hello@example.com")).toEqual({
      href: "mailto:hello@example.com",
      target: "mail",
    });
  });

  it("실행 가능한 스킴과 프로토콜 상대 주소를 거부한다", () => {
    ["javascript:alert(1)", "data:text/html,<script>", "//evil.example", "/\\evil.example"].forEach(
      (href) => expect(resolveArticleLink(href)).toBeNull(),
    );
  });

  it("HTTP 외부 주소는 허용하지 않는다", () => {
    // 사이트의 다른 공개 링크와 같은 판정을 쓴다 — 정책을 두 벌 두면 한쪽만 느슨해진다.
    expect(resolveArticleLink("http://example.com")).toBeNull();
  });
});

describe("resolveArticleImageSource", () => {
  it("관리자 Storage 주소만 통과시킨다", () => {
    const storage =
      "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/dev-blog%2Fa%2Fb.webp?alt=media";

    expect(resolveArticleImageSource(storage)).toBe(storage);
    expect(resolveArticleImageSource("https://storage.googleapis.com/demo/a.webp")).toBe(
      "https://storage.googleapis.com/demo/a.webp",
    );
  });

  it("허용 호스트가 CSP img-src 와 어긋나지 않는다", () => {
    // 한쪽만 늘리면 렌더는 통과했는데 브라우저가 막아 본문에 빈 칸만 남는다.
    const policy = buildContentSecurityPolicy(false);

    STORAGE_IMAGE_HOSTS.forEach((host) => {
      expect(resolveArticleImageSource(`${host}/demo/a.webp`)).not.toBeNull();
      expect(policy).toContain(host);
    });
  });

  it("외부 이미지와 잘못된 주소를 거부한다", () => {
    [
      "https://example.com/a.png",
      "http://firebasestorage.googleapis.com/a.webp",
      "https://user:pass@firebasestorage.googleapis.com/a.webp",
      "/local/a.webp",
      "",
    ].forEach((source) => expect(resolveArticleImageSource(source)).toBeNull());
  });
});
