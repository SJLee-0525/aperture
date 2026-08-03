// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

const TOGGLE_LABELS = { showMoreLabel: "더보기", showLessLabel: "접기" };

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
        {...TOGGLE_LABELS}
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
        {...TOGGLE_LABELS}
      />,
    );

    const href = screen.getByRole("link", { name: "Sony α7 IV" }).getAttribute("href");
    expect(new URL(href!, "https://example.com").searchParams.get("q")).toBe("Sony α7 IV");
  });

  it("긴 컬럼을 접어 표시하고 공용 버튼으로 함께 확장한다", () => {
    render(
      <AboutSection
        eyebrow="Developer"
        summary="소개"
        body=""
        stats={[]}
        collapsedItemCount={2}
        cols={[
          { label: "사용 기술", items: ["React", "Next.js", "TypeScript"] },
          { label: "분야", items: ["Frontend", "Backend", "Design"] },
        ]}
        {...TOGGLE_LABELS}
      />,
    );

    expect(screen.queryByRole("link", { name: "TypeScript" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Design" })).toBeNull();

    const toggle = screen.getByRole("button", { name: "더보기" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")?.split(" ")).toHaveLength(2);
    fireEvent.click(toggle);

    expect(screen.getByRole("link", { name: "TypeScript" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Design" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "접기" }).getAttribute("aria-expanded")).toBe("true");
  });
});
