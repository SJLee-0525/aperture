// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AboutSection } from "@/components/AboutSection";

vi.mock("motion/react", () => ({
  m: {
    header: "header",
    div: "div",
  },
  animate: () => ({ stop: vi.fn() }),
  useReducedMotion: () => true,
}));

describe("AboutSection", () => {
  afterEach(cleanup);

  it("목록 항목을 통합 검색 링크로 표시한다", () => {
    render(
      <AboutSection
        eyebrow="Developer"
        summary="소개"
        body=""
        stats={[]}
        cols={[{ label: "사용 기술", items: ["React", "Next.js"] }]}
      />,
    );

    expect(screen.getByRole("link", { name: "React" }).getAttribute("href")).toBe(
      "/search?q=React",
    );
    expect(screen.getByRole("link", { name: "Next.js" }).getAttribute("href")).toBe(
      "/search?q=Next.js",
    );
  });

  it("공백과 비 ASCII 문자를 검색 쿼리로 인코딩한다", () => {
    render(
      <AboutSection
        eyebrow="Aperture."
        summary="소개"
        body=""
        stats={[]}
        cols={[{ label: "카메라", items: ["Sony α7 IV"] }]}
      />,
    );

    const href = screen.getByRole("link", { name: "Sony α7 IV" }).getAttribute("href");
    expect(new URL(href!, "https://example.com").searchParams.get("q")).toBe("Sony α7 IV");
  });
});
